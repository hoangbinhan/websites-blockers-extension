document.addEventListener('DOMContentLoaded', () => {
  const timeInfo = document.querySelector('.time-info');
  const now = new Date();
  const currentTime = now.toLocaleTimeString();
  timeInfo.innerHTML += `<p>Current time: ${currentTime}</p>`;
}); 