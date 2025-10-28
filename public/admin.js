const searchBox = document.getElementById('search');
const tableBody = document.getElementById('participantTable');

// ✅ Create and append Year + Day filters
const filtersContainer = searchBox.parentElement;
const yearInput = document.createElement('input');
const dayInput = document.createElement('input');

yearInput.type = 'number';
yearInput.id = 'year';
yearInput.placeholder = 'Year';
yearInput.min = 2000;
// yearInput.style.marginRight = '10px';

dayInput.type = 'date';
dayInput.id = 'day';
// dayInput.style.marginLeft = '10px';

filtersContainer.insertBefore(yearInput, searchBox);
filtersContainer.appendChild(dayInput);

// ✅ Set default values (today)
const today = new Date();
yearInput.value = today.getFullYear();
dayInput.value = today.toISOString().split('T')[0];

// ✅ Fetch participants (from main table, but joined with attendance info)
async function fetchParticipants() {
const query = searchBox.value.trim();
const year = yearInput.value;
const day = dayInput.value;

let url = `/search?`;
const params = [];

if (query) params.push(`q=${encodeURIComponent(query)}`);
if (year) params.push(`year=${encodeURIComponent(year)}`);
if (day) params.push(`day=${encodeURIComponent(day)}`);

url += params.join('&');

try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) {
    tableBody.innerHTML = `
        <tr>
        <td colspan="5" style="text-align:center; color:gray;">No records found</td>
        </tr>`;
    return;
    }

    // ✅ Render table
    tableBody.innerHTML = data.map(p => `
    <tr data-id="${p.id}">
        <td>${p.name}</td>
        <td>${p.email || '-'}</td>
        <td>${p.address}</td>
        <td>${p.occupation}</td>
        <td class="status-cell" 
            style="background: ${p.marked ? '#00B2FF50' : '#FF5E0050'};
                    color:${p.marked ? 'limegreen' : 'orange'};">
        ${p.marked ? 'Marked' : 'Not Marked'}
        </td>
    </tr>
    `).join('');

    // ✅ Add click event to toggle attendance
    document.querySelectorAll('.status-cell').forEach(cell => {
    cell.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        const id = row.dataset.id;

        try {
        const res = await fetch(`/toggleAttendance/${id}`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            fetchParticipants(); // refresh display
        } else {
            alert('Error toggling attendance');
        }
        } catch (err) {
        console.error('Toggle error:', err);
        }
    });
    });

} catch (err) {
    console.error('❌ Error fetching participants:', err);
}
}

// ✅ Debounce helper for smooth searching
function debounce(fn, delay) {
let timer;
return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
};
}

// ✅ Automatically refresh on any input change
searchBox.addEventListener('input', debounce(fetchParticipants, 400));
yearInput.addEventListener('input', fetchParticipants);
dayInput.addEventListener('input', fetchParticipants);

// ✅ Load today’s records on page load
fetchParticipants();
