// Global array to store plant data (will still be used to hold data fetched from Supabase)
let plants = [];
let currentView = 'active';

// Supabase Client Initialization
const SUPABASE_URL = 'https://lyxhvdieqvrqwhiyexec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eGh2ZGllcXZycXdoaXlleGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTI2MTEsImV4cCI6MjA2NDM2ODYxMX0.bxwthc51yKwq1glvpv4pAtW2QEZNCEhoJ5x4wiogbks';

let supabaseClient;
try {
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized.');
    } else {
        throw new Error('Supabase client library not found. Make sure the CDN link is correct and loads before this script.');
    }
} catch (e) {
    console.error('Error initializing Supabase client:', e);
    alert('Failed to initialize data connection. Please check the console and ensure Supabase client is available.');
}

// What3Words API Key
const W3W_API_KEY = '3J0F7HGD';

// DOM Elements
const plantsListContainer = document.getElementById('plantsListContainer');
const formTitle = document.getElementById('formTitle');
const plantForm = document.getElementById('plantForm');
const plantIdInput = document.getElementById('plantId');
const nameInput = document.getElementById('name');
const typeInput = document.getElementById('type');
const w3wInput = document.getElementById('w3w');
const areaInput = document.getElementById('area');
const townInput = document.getElementById('town');
const ripensInput = document.getElementById('ripens');
const harvestMonthInput = document.getElementById('harvestMonth');
const notesInput = document.getElementById('notes');
const getW3wLocationBtn = document.getElementById('getW3wLocationBtn');
const activePlantsTab = document.getElementById('activePlantsTab');
const archivedPlantsTab = document.getElementById('archivedPlantsTab');


let originalW3wButtonIconHTML = '';
let plantModalInstance = null;
const plantFormModalElement = document.getElementById('plantFormModal');

async function loadPlants() {
    if (!supabaseClient) {
        console.error("Supabase client not initialized. Cannot load plants.");
        if(plantsListContainer) plantsListContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error: Data connection not available.</p></div>';
        return;
    }

    console.log("Loading plants from Supabase...");
    try {
        const { data, error } = await supabaseClient
            .from('plants')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading plants from Supabase:', error);
            if (plantsListContainer) {
                plantsListContainer.innerHTML = `<div class="col-12"><p class="text-danger">Error loading plant data: ${error.message}</p></div>`;
            }
            plants = [];
        } else {
            plants = data || [];
            console.log("Plants loaded successfully:", plants);
        }
    } catch (catchError) {
        console.error('Unexpected error in loadPlants:', catchError);
        if (plantsListContainer) {
            plantsListContainer.innerHTML = `<div class="col-12"><p class="text-danger">An unexpected error occurred while loading data.</p></div>`;
        }
        plants = [];
    } finally {
        renderPlants();
    }
}

function renderPlants() {
    if (!plantsListContainer) {
        console.error('plantsListContainer not found');
        return;
    }
    plantsListContainer.innerHTML = '';

    const plantsToDisplay = plants.filter(plant => {
        if (currentView === 'active') {
            return !plant.is_archived;
        } else if (currentView === 'archived') {
            return plant.is_archived === true;
        }
        return false;
    });

    if (plantsToDisplay.length === 0) {
        if (currentView === 'active') {
            plantsListContainer.innerHTML = '<div class="col-12"><p>No active plants found. Use the "Add New Plant" button to track one!</p></div>';
        } else {
            plantsListContainer.innerHTML = '<div class="col-12"><p>No archived plants found.</p></div>';
        }
        return;
    }

    plantsToDisplay.forEach(plant => {
        const cardW3W = plant.w3w || '';
        let buttonsHTML = '';

        if (!plant.is_archived) {
            buttonsHTML = `
                <button class="btn btn-sm btn-primary edit-btn me-1" data-id="${plant.id}">Edit</button>
                <button class="btn btn-sm btn-warning archive-btn" data-id="${plant.id}">Archive</button>
            `;
        } else {
            buttonsHTML = `
                <button class="btn btn-sm btn-info unarchive-btn" data-id="${plant.id}">Unarchive</button>
                <button class="btn btn-sm btn-danger delete-btn ms-1" data-id="${plant.id}">Delete</button>
            `;
            // Delete button only for archived plants
        }
        // Note: Delete button is removed from active plants view based on subtask requirement.

        const card = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${plant.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${plant.type}</h6>
                        <p class="card-text">
                            <strong>W3W:</strong> <a href="https://what3words.com/${cardW3W.replace(/\/\/\//g, '')}" target="_blank">${cardW3W}</a><br>
                            <strong>Area:</strong> ${plant.area || 'N/A'}<br>
                            <strong>City/Town:</strong> ${plant.town || 'N/A'}<br>
                            <strong>Ripens:</strong> ${plant.ripens || 'N/A'}<br>
                            <strong>Harvest:</strong> ${plant.harvestMonth || 'N/A'}<br>
                            <strong>Notes:</strong> ${plant.notes || 'N/A'}
                        </p>
                        <div class="mt-2">
                            ${buttonsHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
        plantsListContainer.insertAdjacentHTML('beforeend', card);
    });

    attachEventListenersToButtons();
}


function attachEventListenersToButtons() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.removeEventListener('click', handleEditPlant); // Prevent duplicates
        button.addEventListener('click', handleEditPlant);
    });

    // Archive buttons
    document.querySelectorAll('.archive-btn').forEach(button => {
        button.removeEventListener('click', handleArchivePlant); // Prevent duplicates
        button.addEventListener('click', handleArchivePlant);
    });

    // Unarchive buttons
    document.querySelectorAll('.unarchive-btn').forEach(button => {
        button.removeEventListener('click', handleUnarchivePlant); // Prevent duplicates
        button.addEventListener('click', handleUnarchivePlant);
    });

    // Delete buttons (still relevant)
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.removeEventListener('click', handleDeletePlant); // Prevent duplicates
        button.addEventListener('click', handleDeletePlant);
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!nameInput.value.trim() || !w3wInput.value.trim()) {
        alert('Please provide at least a Name and What3Words address.');
        return;
    }

    const idToUpdate = plantIdInput.value;

    let plantDataPayload = {
        name: nameInput.value.trim(),
        type: typeInput.value,
        w3w: w3wInput.value.trim(),
        area: areaInput.value.trim() || null,
        town: townInput.value.trim() || null,
        ripens: ripensInput.value.trim() || null,
        harvestMonth: harvestMonthInput.value.trim() || null,
        notes: notesInput.value.trim() || null
    };

    if (idToUpdate) {
        if (!supabaseClient) { alert("Database connection not available."); return; }
        console.log(`Updating plant with ID ${idToUpdate} in Supabase...Data:`, plantDataPayload);
        try {
            const { data, error } = await supabaseClient
                .from('plants')
                .update(plantDataPayload)
                .eq('id', idToUpdate)
                .select();
            if (error) {
                console.error('Error updating plant in Supabase:', error);
                alert(`Error updating plant: ${error.message}`);
            } else {
                console.log('Plant updated successfully in Supabase:', data);
                await loadPlants();
                if (plantModalInstance) plantModalInstance.hide();
            }
        } catch (catchError) {
            console.error('Unexpected error updating plant:', catchError);
            alert('An unexpected error occurred while updating the plant.');
        }
    } else {
        plantDataPayload.is_archived = false;

        if (!supabaseClient) { alert("Database connection not available."); return; }
        console.log("Adding new plant to Supabase...Data:", plantDataPayload);
        try {
            const {data, error} = await supabaseClient
                .from('plants')
                .insert([plantDataPayload])
                .select();
            if (error) {
                console.error('Error adding plant:', error); alert(`Error saving plant: ${error.message}`);
            } else {
                await loadPlants();
                plantForm.reset();
                plantIdInput.value = '';
                if (plantModalInstance) plantModalInstance.hide();
            }
        } catch (e) {
            console.error('Unexpected error saving plant:', e);
            alert('An unexpected error occurred while saving the plant.');
        }
    }
}

async function handleEditPlant(event) {
    const id = event.target.dataset.id;
    if (!id) {
        console.error("Edit button clicked but no ID found.");
        alert("Cannot edit: Plant ID not found.");
        return;
    }

    const plantToEdit = plants.find(p => p.id.toString() === id);

    if (plantToEdit) {
        console.log("Editing plant:", plantToEdit);
        if (formTitle) formTitle.textContent = 'Edit Plant';
        plantIdInput.value = plantToEdit.id;
        nameInput.value = plantToEdit.name;
        typeInput.value = plantToEdit.type;
        w3wInput.value = plantToEdit.w3w;
        areaInput.value = plantToEdit.area || '';
        townInput.value = plantToEdit.town || '';
        ripensInput.value = plantToEdit.ripens || '';
        harvestMonthInput.value = plantToEdit.harvestMonth || '';
        notesInput.value = plantToEdit.notes || '';

        if (plantModalInstance) {
            plantModalInstance.show();
        } else {
            console.error("plantModalInstance not available to show modal for edit.");
            alert("Error: Could not open edit form.");
        }
    } else {
        console.error("Plant to edit not found in array. ID:", id);
        alert("Error: Could not find the plant to edit.");
    }
}

async function handleDeletePlant(event) {
    const idToDelete = event.target.dataset.id;
    if (!idToDelete) {
        console.error("Delete button clicked but no ID found.");
        alert("Cannot delete: Plant ID not found.");
        return;
    }
    const plantNameForConfirm = plants.find(p => p.id.toString() === idToDelete)?.name || "the selected plant";

    if (window.confirm(`Are you sure you want to delete "${plantNameForConfirm}"?`)) {
        if (!supabaseClient) {
            alert("Database connection not available. Cannot delete plant.");
            return;
        }
        console.log(`Deleting plant with ID ${idToDelete} from Supabase...`);
        try {
            const { error } = await supabaseClient
                .from('plants')
                .delete()
                .eq('id', idToDelete);

            if (error) {
                console.error('Error deleting plant from Supabase:', error);
                alert(`Error deleting plant: ${error.message}`);
            } else {
                console.log('Plant deleted successfully from Supabase. ID:', idToDelete);
                if (plantIdInput.value === idToDelete) {
                    plantForm.reset();
                    plantIdInput.value = '';
                    if (formTitle) formTitle.textContent = 'Add New Plant';
                    nameInput.focus();
                }
                await loadPlants();
            }
        } catch (catchError) {
            console.error('Unexpected error deleting plant:', catchError);
            alert('An unexpected error occurred while deleting the plant.');
        }
    } else {
        console.log("Deletion cancelled by user. ID:", idToDelete);
    }
}

async function handleArchivePlant(event) {
    const button = event.target.closest('.archive-btn');
    if (!button) return;

    const plantId = button.dataset.id;
    if (!plantId) {
        alert("Error: Could not identify plant to archive.");
        return;
    }

    const plantToArchive = plants.find(p => p.id.toString() === plantId);
    const plantName = plantToArchive ? plantToArchive.name : "this plant";

    if (window.confirm(`Are you sure you want to archive "${plantName}"?`)) {
        if (!supabaseClient) {
            alert("Database connection not available. Cannot archive plant.");
            return;
        }
        console.log(`Archiving plant with ID ${plantId}...`);
        try {
            const { data, error } = await supabaseClient
                .from('plants')
                .update({ is_archived: true })
                .eq('id', plantId)
                .select();

            if (error) {
                console.error('Error archiving plant in Supabase:', error);
                alert(`Error archiving plant: ${error.message}`);
            } else {
                console.log('Plant archived successfully in Supabase:', data);
                await loadPlants();
            }
        } catch (catchError) {
            console.error('Unexpected error archiving plant:', catchError);
            alert('An unexpected error occurred while archiving the plant.');
        }
    } else {
        console.log("Archiving cancelled by user for plant ID:", plantId);
    }
}

async function handleUnarchivePlant(event) {
    const button = event.target.closest('.unarchive-btn');
    if (!button) return;

    const plantId = button.dataset.id;
    if (!plantId) {
        alert("Error: Could not identify plant to unarchive.");
        return;
    }

    if (!supabaseClient) {
        alert("Database connection not available. Cannot unarchive plant.");
        return;
    }
    console.log(`Unarchiving plant with ID ${plantId}...`);
    try {
        const { data, error } = await supabaseClient
            .from('plants')
            .update({ is_archived: false })
            .eq('id', plantId)
            .select();

        if (error) {
            console.error('Error unarchiving plant in Supabase:', error);
            alert(`Error unarchiving plant: ${error.message}`);
        } else {
            console.log('Plant unarchived successfully in Supabase:', data);
            await loadPlants();
        }
    } catch (catchError) {
        console.error('Unexpected error unarchiving plant:', catchError);
        alert('An unexpected error occurred while unarchiving the plant.');
    }
}


async function geolocationSuccess(position) {
    console.log('Geolocation successful:', position);
    const { latitude, longitude } = position.coords;
    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
    const w3wApiUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude}%2C${longitude}&key=${W3W_API_KEY}`;

    try {
        const response = await fetch(w3wApiUrl);
        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorMsg = `W3W API Error: ${errorData.error.message}`;
                }
            } catch (jsonError) {
                console.warn("Could not parse W3W error response as JSON:", jsonError);
            }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data && data.words) {
            w3wInput.value = data.words;
            alert('What3Words address fetched successfully!');
        } else {
            console.error('Error: W3W API response did not contain words.', data);
            alert('Could not retrieve a valid What3Words address. Response might be malformed.');
        }
    } catch (error) {
        console.error('Error fetching What3Words address:', error);
        alert(`Failed to fetch What3Words address: ${error.message}`);
    } finally {
        if (getW3wLocationBtn) {
            getW3wLocationBtn.disabled = false;
            getW3wLocationBtn.innerHTML = originalW3wButtonIconHTML;
        }
    }
}

function geolocationError(error) {
    console.error('Geolocation error:', error);
    let message = 'Error getting location: ';
    switch (error.code) {
        case error.PERMISSION_DENIED: message += "User denied the request for Geolocation."; break;
        case error.POSITION_UNAVAILABLE: message += "Location information is unavailable."; break;
        case error.TIMEOUT: message += "The request to get user location timed out."; break;
        default: message += "An unknown error occurred."; break;
    }
    alert(message);
    if (getW3wLocationBtn) {
        getW3wLocationBtn.disabled = false;
        getW3wLocationBtn.innerHTML = originalW3wButtonIconHTML;
    }
}

async function fetchAndSetW3WAddress() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    if (!getW3wLocationBtn) return;

    console.log('Requesting geolocation...');
    getW3wLocationBtn.disabled = true;
    getW3wLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

/**
 * Updates the active state of the view tabs.
 * @param {string} newView - 'active' or 'archived'.
 */
function updateTabView(newView) {
    currentView = newView;
    if (activePlantsTab && archivedPlantsTab) {
        if (newView === 'active') {
            activePlantsTab.classList.add('active');
            activePlantsTab.setAttribute('aria-selected', 'true');
            archivedPlantsTab.classList.remove('active');
            archivedPlantsTab.setAttribute('aria-selected', 'false');
        } else if (newView === 'archived') {
            archivedPlantsTab.classList.add('active');
            archivedPlantsTab.setAttribute('aria-selected', 'true');
            activePlantsTab.classList.remove('active');
            activePlantsTab.setAttribute('aria-selected', 'false');
        }
    }
    renderPlants();
}


document.addEventListener('DOMContentLoaded', () => {
    if (plantFormModalElement) {
        plantModalInstance = new bootstrap.Modal(plantFormModalElement);
        plantFormModalElement.addEventListener('show.bs.modal', function (event) {
            const triggerButton = event.relatedTarget;
            console.log("Modal triggered by:", triggerButton);
            if (!plantIdInput.value) {
                console.log("Configuring modal for ADD NEW PLANT");
                if (formTitle) formTitle.textContent = 'Add New Plant';
                plantForm.reset();
            }
        });
        plantFormModalElement.addEventListener('shown.bs.modal', function () {
            if (!plantIdInput.value) {
                if (nameInput) nameInput.focus();
            }
        });
    } else {
        console.error("plantFormModalElement not found!");
    }

    if (plantForm) {
        plantForm.addEventListener('submit', handleFormSubmit);
    }

    if (getW3wLocationBtn) {
        originalW3wButtonIconHTML = getW3wLocationBtn.innerHTML;
        getW3wLocationBtn.addEventListener('click', fetchAndSetW3WAddress);
    } else {
        console.warn("getW3wLocationBtn not found.");
    }

    // Tab Event Listeners
    if (activePlantsTab) {
        activePlantsTab.addEventListener('click', () => {
            updateTabView('active');
        });
    } else {
        console.warn("Active plants tab button not found.");
    }

    if (archivedPlantsTab) {
        archivedPlantsTab.addEventListener('click', () => {
            updateTabView('archived');
        });
    } else {
        console.warn("Archived plants tab button not found.");
    }

    if (supabaseClient) {
        loadPlants();
    } else {
        console.warn("Supabase client not initialized. Data loading will be skipped.");
        if(plantsListContainer) plantsListContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error: Could not connect to data service. Please check console.</p></div>';
    }
});

console.log("script.js processed, Supabase client initialized (or attempted).");
