// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if(element) element.innerText = text
  }

  for(const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  const {shell} = require('electron').shell;

  document.body.addEventListener('click', event => {
    if(event.target.tagName.toLowerCase() === 'a' && event.target.protocol != 'file:') {
      event.preventDefault();
      event.stopPropagation();
      shell.openExternal(event.target.href);
    }
  });
})
