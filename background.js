// Initialize alarms and context menu when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
  setupContextMenu();
});

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) { // Only block main frame navigation
    const { blockedSites = [], schedules = [] } = await chrome.storage.sync.get(['blockedSites', 'schedules']);
    const url = new URL(details.url);
    const hostname = url.hostname.toLowerCase();

    // Check if the site is blocked
    const blockedSite = blockedSites.find(site => {
      const siteToCheck = site.url.toLowerCase();
      // Check if the hostname contains the blocked site or vice versa
      return hostname.includes(siteToCheck) || siteToCheck.includes(hostname);
    });
    
    if (blockedSite) {
      // If there are no schedules at all, block at all times
      if (schedules.length === 0 && !blockedSite.schedule) {
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('blocked.html')
        });
        return;
      }

      // Check if current time is within any active schedule
      const isWithinSchedule = checkSchedule(blockedSite.schedule || schedules);
      
      if (isWithinSchedule) {
        // Block the site
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('blocked.html')
        });
      }
    }
  }
});

function checkSchedule(schedules) {
  if (!Array.isArray(schedules)) {
    schedules = [schedules];
  }

  return schedules.some(schedule => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                      now.getMinutes().toString().padStart(2, '0');
    const currentDay = now.getDay();
    
    // Check if current day matches schedule
    const isDayMatch = schedule.days === 'all' ||
                      (schedule.days === 'weekdays' && currentDay >= 1 && currentDay <= 5) ||
                      (schedule.days === 'weekends' && (currentDay === 0 || currentDay === 6));
    
    return isDayMatch && currentTime >= schedule.startTime && currentTime <= schedule.endTime;
  });
}

// Setup alarms for schedule changes
function setupAlarms() {
  chrome.alarms.clearAll();
  
  chrome.storage.sync.get(['schedules'], (result) => {
    const schedules = result.schedules || [];
    
    schedules.forEach(schedule => {
      // Create alarms for start and end times
      chrome.alarms.create(`start_${schedule.startTime}`, {
        when: getNextAlarmTime(schedule.startTime, schedule.days)
      });
      
      chrome.alarms.create(`end_${schedule.endTime}`, {
        when: getNextAlarmTime(schedule.endTime, schedule.days)
      });
    });
  });
}

// Calculate the next time an alarm should trigger
function getNextAlarmTime(time, days) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const alarmTime = new Date(now);
  alarmTime.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, set it for tomorrow
  if (alarmTime < now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }

  // Adjust for specific days
  if (days !== 'all') {
    const currentDay = now.getDay();
    const daysUntilNext = days === 'weekdays' 
      ? (currentDay >= 5 ? 8 - currentDay : 1) // If weekend, wait until Monday
      : (currentDay >= 1 && currentDay <= 5 ? 6 - currentDay : 1); // If weekday, wait until Saturday
    
    alarmTime.setDate(alarmTime.getDate() + daysUntilNext);
  }

  return alarmTime.getTime();
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  setupAlarms(); // Reset alarms for the next day
});

// Setup context menu
function setupContextMenu() {
  chrome.contextMenus.create({
    id: "blockThisSite",
    title: "Block this site",
    contexts: ["page", "link"]
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "blockThisSite") {
    let url;
    if (info.linkUrl) {
      url = info.linkUrl;
    } else {
      url = tab.url;
    }
    
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
      
      if (!blockedSites.some(site => site.url === hostname)) {
        blockedSites.push({
          url: hostname,
          schedule: null // Using global schedule
        });
        await chrome.storage.sync.set({ blockedSites });
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Site Blocked',
          message: `${hostname} has been added to your blocked sites list.`
        });
      }
    } catch (error) {
      console.error('Error blocking site:', error);
    }
  }
}); 