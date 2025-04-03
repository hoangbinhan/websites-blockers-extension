document.addEventListener('DOMContentLoaded', () => {
  // Load blocked sites and schedules
  loadBlockedSites();
  loadSchedules();

  // Add site button handler
  document.getElementById('addSite').addEventListener('click', addSite);

  // Add current site button handler
  document.getElementById('addCurrentSite').addEventListener('click', addCurrentSite);

  // Save schedule button handler
  document.getElementById('saveSchedule').addEventListener('click', saveSchedule);

  // Site schedule modal handlers
  document.getElementById('saveSiteSchedule').addEventListener('click', saveSiteSchedule);
  document.getElementById('cancelSiteSchedule').addEventListener('click', closeSiteScheduleModal);

  // Add Enter key handler for website input
  document.getElementById('siteUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSite();
    }
  });

  // Add event delegation for delete buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      if (e.target.dataset.schedule) {
        deleteSchedule(e);
      } else if (e.target.dataset.site) {
        deleteSite(e);
      }
    } else if (e.target.classList.contains('set-schedule-btn')) {
      openSiteScheduleModal(e.target.dataset.site);
    } else if (e.target.classList.contains('delete-schedule-btn')) {
      deleteSiteSchedule(e.target.dataset.site);
    }
  });
});

let currentEditingSite = null;

async function openSiteScheduleModal(siteUrl) {
  currentEditingSite = siteUrl;
  const modal = document.getElementById('siteScheduleModal');
  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  const site = blockedSites.find(s => s.url === siteUrl);
  
  if (site && site.schedule) {
    document.getElementById('siteStartTime').value = site.schedule.startTime;
    document.getElementById('siteEndTime').value = site.schedule.endTime;
    document.getElementById('siteDays').value = site.schedule.days;
  } else {
    document.getElementById('siteStartTime').value = '';
    document.getElementById('siteEndTime').value = '';
    document.getElementById('siteDays').value = 'all';
  }
  
  modal.style.display = 'block';
}

function closeSiteScheduleModal() {
  const modal = document.getElementById('siteScheduleModal');
  modal.style.display = 'none';
  currentEditingSite = null;
}

async function saveSiteSchedule() {
  const startTime = document.getElementById('siteStartTime').value;
  const endTime = document.getElementById('siteEndTime').value;
  const days = document.getElementById('siteDays').value;

  if (!startTime || !endTime || !currentEditingSite) return;

  const schedule = { startTime, endTime, days };
  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  
  const updatedSites = blockedSites.map(site => {
    if (site.url === currentEditingSite) {
      return { ...site, schedule };
    }
    return site;
  });

  await chrome.storage.sync.set({ blockedSites: updatedSites });
  closeSiteScheduleModal();
  loadBlockedSites();
}

async function loadBlockedSites() {
  const { blockedSites = [], schedules = [] } = await chrome.storage.sync.get(['blockedSites', 'schedules']);
  const blockedSitesList = document.getElementById('blockedSitesList');
  blockedSitesList.innerHTML = '';

  blockedSites.forEach(site => {
    const li = document.createElement('li');
    const scheduleText = site.schedule 
      ? `Custom schedule: ${site.schedule.startTime} - ${site.schedule.endTime} (${site.schedule.days})`
      : (schedules.length === 0 ? 'Blocked at all times' : 'Using global schedule');
    
    const scheduleButton = site.schedule 
      ? `<button class="delete-schedule-btn" data-site="${site.url}">Delete Schedule</button>`
      : '';
    
    li.innerHTML = `
      <div>
        <span>${site.url}</span>
        <div class="site-schedule">Status: ${scheduleText}</div>
      </div>
      <div class="site-actions">
        <button class="set-schedule-btn" data-site="${site.url}">Set Schedule</button>
        ${scheduleButton}
        <button class="delete-btn" data-site="${site.url}">Delete</button>
      </div>
    `;
    blockedSitesList.appendChild(li);
  });
}

async function loadSchedules() {
  const { schedules = [] } = await chrome.storage.sync.get('schedules');
  const scheduleList = document.getElementById('scheduleList');
  scheduleList.innerHTML = '';

  if (schedules.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<span>No schedules set - sites are blocked at all times</span>';
    scheduleList.appendChild(li);
    return;
  }

  schedules.forEach(schedule => {
    const li = document.createElement('li');
    const scheduleData = JSON.stringify(schedule).replace(/"/g, '&quot;');
    li.innerHTML = `
      <div class="active-schedule-item">
        <span>${schedule.startTime} - ${schedule.endTime} (${schedule.days})</span>
        <button class="delete-btn" data-schedule="${scheduleData}">Delete</button>
      </div>
    `;
    scheduleList.appendChild(li);
  });
}

async function addSite() {
  let siteUrl = document.getElementById('siteUrl').value.trim();
  
  // Remove common URL prefixes if present
  siteUrl = siteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
  
  if (!siteUrl) {
    // If no URL entered, add current site
    await addCurrentSite();
    return;
  }

  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  if (!blockedSites.some(site => site.url === siteUrl)) {
    blockedSites.push({
      url: siteUrl,
      schedule: null // Using global schedule
    });
    await chrome.storage.sync.set({ blockedSites });
    document.getElementById('siteUrl').value = '';
    loadBlockedSites();
  }
}

async function addCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const hostname = url.hostname.toLowerCase();
    
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    if (!blockedSites.some(site => site.url === hostname)) {
      blockedSites.push({
        url: hostname,
        schedule: null // Using global schedule
      });
      await chrome.storage.sync.set({ blockedSites });
      loadBlockedSites();
    }
  } catch (error) {
    console.error('Error adding current site:', error);
  }
}

async function saveSchedule() {
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const days = document.getElementById('days').value;

  if (!startTime || !endTime) return;

  const schedule = { startTime, endTime, days };
  const { schedules = [] } = await chrome.storage.sync.get('schedules');
  schedules.push(schedule);
  await chrome.storage.sync.set({ schedules });
  
  // Reset inputs
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('days').value = 'all';
  
  loadSchedules();
  loadBlockedSites(); // Reload blocked sites to update their status
}

async function deleteSite(e) {
  const siteUrl = e.target.dataset.site;
  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  const newBlockedSites = blockedSites.filter(site => site.url !== siteUrl);
  await chrome.storage.sync.set({ blockedSites: newBlockedSites });
  loadBlockedSites();
}

async function deleteSchedule(e) {
  try {
    const scheduleData = e.target.dataset.schedule;
    if (!scheduleData) {
      console.error('No schedule data found');
      return;
    }
    
    const scheduleToDelete = JSON.parse(scheduleData);
    const { schedules = [] } = await chrome.storage.sync.get('schedules');
    
    // Find the exact schedule to delete
    const newSchedules = schedules.filter(schedule => 
      schedule.startTime !== scheduleToDelete.startTime || 
      schedule.endTime !== scheduleToDelete.endTime || 
      schedule.days !== scheduleToDelete.days
    );
    
    await chrome.storage.sync.set({ schedules: newSchedules });
    loadSchedules();
    loadBlockedSites(); // Reload blocked sites to update their status
  } catch (error) {
    console.error('Error deleting schedule:', error);
  }
}

async function deleteSiteSchedule(siteUrl) {
  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  const updatedSites = blockedSites.map(site => {
    if (site.url === siteUrl) {
      return { ...site, schedule: null };
    }
    return site;
  });
  
  await chrome.storage.sync.set({ blockedSites: updatedSites });
  loadBlockedSites();
} 