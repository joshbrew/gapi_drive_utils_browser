// src/main.ts

import { GFileBrowser } from '../GDrive';
import './index.css';

// ——————————————————————————————————————————
// Instantiate with OAuth client ID & root folder
// ——————————————————————————————————————————
const clientId = ''; //dummy id
const gdrive = new GFileBrowser(clientId, { directory: 'AppData' });


//public spreadsheet test
const publicSheet = `https://docs.google.com/spreadsheets/d/1gZaAM2l9JVF3TqK_-euYdhe9FHNX8cZcEfnDIG6AOsQ/edit?usp=sharing`;

const loadPublicSheet = async () => {
    try {
      const container = document.getElementById('public-sheet-container')!;
      container.innerHTML = '';
  
      // fetch & parse CSV as before…
      const { data } = await GFileBrowser.fetchPublicFile(publicSheet, {
        exportMime: 'text/csv',
        gid: 0
      });
      const csv = typeof data === 'string' ? data : await (data as Blob).text();
      const rows = csv.trim().split('\n').map(r => r.split(','));
  
      // patterns
      const imageExt    = /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i;
      const driveFile   = /\/file\/d\/([A-Za-z0-9_-]+)\//;
      const guPreview   = /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)(?:=[^?]*)?/;
      const anyUrl      = /^https?:\/\/\S+$/i;
  
      const table = document.createElement('table');
      table.style.borderCollapse = 'collapse';
  
      rows.forEach((row, rowIdx) => {
        const tr = document.createElement('tr');
  
        row.forEach(cell => {
          const td = document.createElement(rowIdx === 0 ? 'th' : 'td');
          td.style.border = '1px solid #ccc';
          td.style.padding = '4px 8px';
  
          // split on semicolon or whitespace
          const parts = cell.trim().split(/[\s;]+/).filter(p => p);
  
          if (rowIdx === 0) {
            // header
            td.textContent = cell;
          } else {
            parts.forEach((text, i) => {
              let imgSrc: string | null = null;
  
              if (imageExt.test(text)) {
                imgSrc = text;
              } else {
                let m;
                if ((m = text.match(driveFile))) {
                  imgSrc = `https://drive.google.com/thumbnail?id=${m[1]}&sz=200`;
                } else if ((m = text.match(guPreview))) {
                  imgSrc = `https://drive.google.com/thumbnail?id=${m[1]}&sz=200`;
                }
              }
  
              if (imgSrc) {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.maxWidth = '200px';
                img.style.height = 'auto';
                img.style.marginRight = '8px';
                td.appendChild(img);
              } else if (anyUrl.test(text)) {
                const a = document.createElement('a');
                a.href = text;
                a.textContent = text;
                a.target = '_blank';
                a.rel = 'noopener';
                td.appendChild(a);
              } else {
                // plain text (e.g. price, name)
                const span = document.createElement('span');
                span.textContent = text;
                td.appendChild(span);
              }
  
              // if multiple items, separate with a line break
              if (parts.length > 1 && i < parts.length - 1) {
                td.appendChild(document.createElement('br'));
              }
            });
          }
  
          tr.appendChild(td);
        });
  
        table.appendChild(tr);
      });
  
      container.appendChild(table);
    } catch (err) {
      console.error(err);
      alert('Failed to load public sheet. See console.');
    }
  };
  


document
    .getElementById('load-public-sheet-btn')!
    .addEventListener('click', loadPublicSheet);

loadPublicSheet();

// ——————————————————————————————————————————
// Utility: ISO timestamp in local TZ
// ——————————————————————————————————————————
function toISOLocal(ts: number): string {
    const d = new Date(ts);
    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    const ms = pad(d.getMilliseconds(), 3);
    const off = d.getTimezoneOffset();
    const sign = off < 0 ? '+' : '-';
    const hh = pad(Math.floor(Math.abs(off) / 60));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}` +
        `(UTC${sign}${hh}:00)`;
}


interface Note { ts: string; text: string }
const notes: Note[] = [];

const authButton = document.getElementById('auth-button')! as HTMLButtonElement;
const addNoteButton = document.getElementById('add-note-button')! as HTMLButtonElement;
const backupButton = document.getElementById('backup-button')! as HTMLButtonElement;
const restoreButton = document.getElementById('restore-button')! as HTMLButtonElement;
const filenameInput = document.getElementById('filename-input')! as HTMLInputElement;
const noteInput = document.getElementById('note-input')! as HTMLInputElement;
const notesTableBody = document.getElementById('notes-table')!.querySelector('tbody')!;

function renderNotes() {
    notesTableBody.innerHTML = '';
    for (const { ts, text } of notes) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${ts}</td><td>${text}</td>`;
        notesTableBody.appendChild(row);
    }
}

function addNote(noteText: string) {
    const ts = toISOLocal(Date.now());
    notes.push({ ts, text: noteText });
    const row = document.createElement('tr');
    row.innerHTML = `<td>${ts}</td><td>${noteText}</td>`;
    notesTableBody.appendChild(row);
}

// Add a new note into memory & table
addNoteButton.addEventListener('click', () => {
    const txt = noteInput.value.trim();
    if (!txt) return;
    addNote(txt);
    noteInput.value = '';
});

// Backup memory buffer to Drive as CSV (overwrites if exists)
backupButton.addEventListener('click', async () => {
    const name = filenameInput.value.trim();
    if (!name) return alert('Please enter a filename to back up.');
    // build CSV: "timestamp,note\n…"
    const csv = notes.map(n => `${n.ts},${n.text.replace(/\n/g, ' ')}`).join('\n');
    try {
        await gdrive.uploadFileToGoogleDrive(
            csv,
            `${name}`,
            'text/csv',
            gdrive.directoryId,
            undefined,
      /* overwrite = */ true
        );
        alert(`Notes backed up to Drive as "${name}.csv"`);
    } catch (e: any) {
        console.error(e);
        alert(`Backup failed: ${e.message || e}`);
    }
});

// Restore from Drive CSV into memory & table
restoreButton.addEventListener('click', async () => {
    const name = filenameInput.value.trim();
    if (!name) return alert('Please enter a filename to restore.');
    try {
        // downloadFileByName returns the Blob without auto-saving if you pass saveToDisk=false
        const blob = await gdrive.downloadFileByName(
            `${name}`,
            'text/csv',
            undefined,
      /* saveToDisk = */ false
        );
        const text = await blob.text();
        notes.length = 0;       // clear memory buffer
        for (const line of text.split('\n').filter(l => l.trim())) {
            const [ts, ...rest] = line.split(',');
            notes.push({ ts, text: rest.join(',') });
        }
        renderNotes();
        alert(`Notes restored from "${name}"`);
    } catch (e: any) {
        console.error(e);
        alert(`Restore failed: ${e.message || e}`);
    }
});

// ——————————————————————————————————————————
// Calendar & Event UI Elements
// ——————————————————————————————————————————
const prevWeekButton = document.getElementById('prev-week')!;
const nextWeekButton = document.getElementById('next-week')!;
const currentWeekSpan = document.getElementById('current-week')!;
const calendarTableBody = document.getElementById('calendar-table')!.querySelector('tbody')!;
const calendarSelect = document.getElementById('calendar-select') as HTMLSelectElement;
const newCalendarNameInput = document.getElementById('new-calendar-name') as HTMLInputElement;
const createCalendarButton = document.getElementById('create-calendar-button')!;
const deleteCalendarButton = document.getElementById('delete-calendar-button')!;

const openAddEventModalButton = document.getElementById('open-add-event-modal')!;
const addEventModal = document.getElementById('add-event-modal')!;
const closeAddEventModalButton = addEventModal.querySelector('.close')!;
const addEventForm = document.getElementById('add-event-form') as HTMLFormElement;
const eventSummaryInput = document.getElementById('event-summary') as HTMLInputElement;
const eventLocationInput = document.getElementById('event-location') as HTMLInputElement;
const eventDescriptionInput = document.getElementById('event-description') as HTMLTextAreaElement;
const eventColorIdInput = document.getElementById('event-colorId') as HTMLSelectElement;
const eventStartInput = document.getElementById('event-start') as HTMLInputElement;
const eventEndInput = document.getElementById('event-end') as HTMLInputElement;
const eventAttendeesInput = document.getElementById('event-attendees') as HTMLInputElement;
const sendNotificationsCheckbox = document.getElementById('send-notifications') as HTMLInputElement;
const createEventButton = document.getElementById('create-event-button')!;
const deleteEventButton = document.getElementById('delete-event-button')!;

// ——————————————————————————————————————————
// Task list UI Elements
// ——————————————————————————————————————————
const tasksCalendarSelect = document.getElementById('tasks-calendar-select') as HTMLSelectElement;
const addTaskButton = document.getElementById('add-task-button')!;
const tasksList = document.getElementById('tasks-list')!;

// ——————————————————————————————————————————
// Authentication & Initialization
// ——————————————————————————————————————————
async function onAuthClick() {
    if (!gdrive.isLoggedIn) {
        try {
            await gdrive.handleUserSignIn();
            authButton.setAttribute('disabled', 'true');
        } catch (e) {
            console.error('Sign-in error:', e);
            return;
        }
    }
    if (gdrive.isLoggedIn) {
        await initializeTasksCalendar();
        await loadCalendars();
        let promises = [
            renderCalendar(),
            gdrive.createFileBrowser('file-browser-container'),
            gdrive.createFileUploader('file-browser-container')
        ];

        await Promise.all(promises);

        authButton.textContent = 'Sign Out';
        authButton.onclick = async () => {
            await gdrive.signOut();
            authButton.onclick = onAuthClick;
            authButton.textContent = 'Sign In';
        };

    }
}
authButton.onclick = onAuthClick;

// ——————————————————————————————————————————
// Calendar Rendering
// ——————————————————————————————————————————
let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);

async function renderCalendar() {
    if (!gdrive.isLoggedIn) return;
    calendarTableBody.innerHTML = '';
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        weekDates.push(d);
    }
    currentWeekSpan.textContent = `${weekDates[0].toDateString()} - ${weekDates[6].toDateString()}`;

    // build empty grid
    for (let hour = 0; hour < 24; hour++) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${hour}:00</td>${weekDates.map(() => '<td></td>').join('')}`;
        calendarTableBody.appendChild(row);
    }

    const calId = calendarSelect.value;
    for (const date of weekDates) {
        const timeMin = new Date(date); timeMin.setHours(0, 0, 0, 0);
        const timeMax = new Date(date); timeMax.setHours(23, 59, 59, 999);
        const events = await gdrive.listEvents(calId, timeMin.toISOString(), timeMax.toISOString());
        for (const ev of events) {
            const start = new Date(ev.start.dateTime);
            const dayIndex = weekDates.findIndex(d => d.toDateString() === start.toDateString());
            const rowIndex = start.getHours();
            const cell = calendarTableBody
                .querySelector(`tr:nth-child(${rowIndex + 1}) td:nth-child(${dayIndex + 2})`)!;
            const div = document.createElement('div');
            div.textContent = ev.summary;
            div.style.cursor = 'pointer';
            div.onclick = () => showEventDetails(ev);
            cell.appendChild(div);
        }
    }
}

// ——————————————————————————————————————————
// Calendar Management
// ——————————————————————————————————————————
async function loadCalendars() {
    const cals = await gdrive.listAllCalendars();
    calendarSelect.innerHTML = '';
    cals.forEach(cal => {
        const opt = document.createElement('option');
        opt.value = cal.id;
        opt.textContent = cal.summary;
        calendarSelect.appendChild(opt);
    });
}

createCalendarButton.addEventListener('click', async () => {
    const name = newCalendarNameInput.value.trim();
    if (!name) return alert('Please enter a calendar name.');
    await gdrive.createCalendar(name);
    await loadCalendars();
    newCalendarNameInput.value = '';
});

deleteCalendarButton.addEventListener('click', async () => {
    const id = calendarSelect.value;
    if (!id) return alert('Please select a calendar.');
    await gdrive.deleteCalendar(id);
    await loadCalendars();
});

// ——————————————————————————————————————————
// Event Modal
// ——————————————————————————————————————————
function showEventDetails(ev: any) {
    const content = document.getElementById('event-details-content')!;
    content.innerHTML = `
    <p><strong>Summary:</strong> ${ev.summary}</p>
    <p><strong>Location:</strong> ${ev.location || 'N/A'}</p>
    <p><strong>Description:</strong> ${ev.description || 'N/A'}</p>
    <p><strong>Start:</strong> ${new Date(ev.start.dateTime).toLocaleString()}</p>
    <p><strong>End:</strong> ${new Date(ev.end.dateTime).toLocaleString()}</p>
  `;
    deleteEventButton.style.display = ev.creator?.self ? 'block' : 'none';
    deleteEventButton.onclick = async () => {
        await gdrive.deleteEvent(ev.calendarId, ev.id);
        await renderCalendar();
        (document.getElementById('event-details-modal')!).style.display = 'none';
    };
    (document.getElementById('event-details-modal')!).style.display = 'block';
}

openAddEventModalButton.addEventListener('click', () => {
    const now = new Date();
    const start = new Date(now.getTime() + 3600_000);
    const end = new Date(start.getTime() + 3600_000);
    addEventForm.reset();
    eventStartInput.value = start.toISOString().slice(0, 16);
    eventEndInput.value = end.toISOString().slice(0, 16);
    addEventModal.style.display = 'block';
});

closeAddEventModalButton.addEventListener('click', () => {
    addEventModal.style.display = 'none';
});

createEventButton.addEventListener('click', async () => {
    if (!addEventForm.checkValidity()) return;
    const ev: any = {
        summary: eventSummaryInput.value.trim(),
        location: eventLocationInput.value.trim(),
        description: eventDescriptionInput.value.trim(),
        start: { dateTime: new Date(eventStartInput.value).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: new Date(eventEndInput.value).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        sendUpdates: sendNotificationsCheckbox.checked ? 'all' : 'none'
    };
    await gdrive.createEvent(calendarSelect.value, ev);
    addEventModal.style.display = 'none';
    await renderCalendar();
});

// ——————————————————————————————————————————
// Task Calendar
// ——————————————————————————————————————————
async function initializeTasksCalendar() {
    const cals = await gdrive.listAllCalendars();
    let tasksCal = cals.find(c => c.summary === 'Tasks');
    if (!tasksCal) {
        await gdrive.createCalendar('Tasks');
        tasksCal = (await gdrive.findCalendarByName('Tasks'))!;
    }
    await loadTaskCalendars();
    await renderTasks();
}

async function loadTaskCalendars() {
    const cals = await gdrive.listAllCalendars();
    tasksCalendarSelect.innerHTML = '';
    cals.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.summary;
        if (c.summary === 'Tasks') opt.selected = true;
        tasksCalendarSelect.appendChild(opt);
    });
}

async function renderTasks() {
    const calId = tasksCalendarSelect.value;
    const today = new Date(), tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const events = await gdrive.listEvents(calId, today.toISOString(), tomorrow.toISOString());
    tasksList.innerHTML = '';
    let lastDay = '';
    events.forEach(ev => {
        const day = new Date(ev.start.dateTime).toDateString();
        if (day !== lastDay) {
            const h = document.createElement('li');
            h.textContent = day;
            tasksList.appendChild(h);
            lastDay = day;
        }
        const li = document.createElement('li');
        li.textContent = `• ${ev.summary} @ ${new Date(ev.start.dateTime).toLocaleTimeString()}`;
        li.onclick = () => showEventDetails(ev);
        tasksList.appendChild(li);
    });
}

addTaskButton.addEventListener('click', () => {
    openAddEventModalButton.click();
    eventSummaryInput.dataset.task = 'true';
});

// ——————————————————————————————————————————
// Service Worker Check
// ——————————————————————————————————————————
async function isServiceWorkerActive(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        return !!navigator.serviceWorker.controller;
    } catch {
        return false;
    }
}

// ——————————————————————————————————————————
// Week navigation
// ——————————————————————————————————————————
prevWeekButton.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
});
nextWeekButton.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
});

// ——————————————————————————————————————————
// Calendar change triggers
// ——————————————————————————————————————————
calendarSelect.addEventListener('change', renderCalendar);
tasksCalendarSelect.addEventListener('change', renderTasks);
