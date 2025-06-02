// Global array to store plant data (will still be used to hold data fetched from Supabase)
let plants = [];

// Supabase Client Initialization
const SUPABASE_URL = 'https://lyxhvdieqvrqwhiyexec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5eGh2ZGllcXZycXdoaXlleGVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTI2MTEsImV4cCI6MjA2NDM2ODYxMX0.bxwthc51yKwq1glvpv4pAtW2QEZNCEhoJ5x4wiogbks';

// Ensure the Supabase client library is loaded before this script runs,
// or handle potential errors if `supabase` is not defined.
// The Supabase script is in <head>, and this script is deferred, so it should be available.
let supabaseClient; // Renamed to avoid conflict with the global 'supabase' object from Supabase library
try {
    // The global object exposed by Supabase v2 CDN is `supabase`
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized.');
    } else {
        throw new Error('Supabase client library not found. Make sure the CDN link is correct and loads before this script.');
    }
} catch (e) {
    console.error('Error initializing Supabase client:', e);
    // Optionally, disable UI elements or show an error message to the user
    alert('Failed to initialize data connection. Please check the console and ensure Supabase client is available.');
}

// What3Words API Key
const W3W_API_KEY = '3J0F7HGD';

// DOM Elements
const plantsListContainer = document.getElementById('plantsListContainer');
const formTitle = document.getElementById('formTitle');
const plantForm = document.getElementById('plantForm');
const plantIdInput = document.getElementById('plantId'); // Hidden input for ID
const nameInput = document.getElementById('name');
const typeInput = document.getElementById('type');
const w3wInput = document.getElementById('w3w');
const areaInput = document.getElementById('area'); // ADD THIS LINE
const townInput = document.getElementById('town'); // ADD THIS LINE
const ripensInput = document.getElementById('ripens');
const harvestMonthInput = document.getElementById('harvestMonth');
const notesInput = document.getElementById('notes');
const getW3wLocationBtn = document.getElementById('getW3wLocationBtn'); // New button
// jsonDataOutput is removed

// Store original icon HTML for the W3W button
let originalW3wButtonIconHTML = ''; // Will be set in DOMContentLoaded
let plantModalInstance = null; // To hold the Bootstrap Modal instance
const plantFormModalElement = document.getElementById('plantFormModal'); // Get modal element

async function loadPlants() {
    if (!supabaseClient) {
        console.error("Supabase client not initialized. Cannot load plants.");
        if(plantsListContainer) plantsListContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error: Data connection not available.</p></div>';
        return;
    }

    console.log("Loading plants from Supabase...");
    try {
        // Fetch data from the 'plants' table, order by 'name' ascending
        const { data, error } = await supabaseClient
            .from('plants')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error loading plants from Supabase:', error);
            if (plantsListContainer) {
                plantsListContainer.innerHTML = `<div class="col-12"><p class="text-danger">Error loading plant data: ${error.message}</p></div>`;
            }
            plants = []; // Ensure plants is empty on error
        } else {
            plants = data || []; // Update global plants array with fetched data, or empty if null/undefined
            console.log("Plants loaded successfully:", plants);
        }
    } catch (catchError) {
        // Catch any other unexpected errors during the async operation
        console.error('Unexpected error in loadPlants:', catchError);
        if (plantsListContainer) {
            plantsListContainer.innerHTML = `<div class="col-12"><p class="text-danger">An unexpected error occurred while loading data.</p></div>`;
        }
        plants = []; // Ensure plants is empty on error
    } finally {
        renderPlants(); // Call renderPlants to update the UI, regardless of success or failure (it handles empty plants array)
    }
}

function renderPlants() {
    if (!plantsListContainer) {
        console.error('plantsListContainer not found');
        return;
    }
    plantsListContainer.innerHTML = '';

    if (plants.length === 0) {
        plantsListContainer.innerHTML = '<div class="col-12"><p>No plants tracked yet. Add one using the form or try refreshing!</p></div>';
    } else {
        plants.forEach(plant => {
            const cardW3W = plant.w3w || '';
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
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${plant.id}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${plant.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `;
            plantsListContainer.insertAdjacentHTML('beforeend', card);
        });
    }
    attachEventListenersToButtons();
    // showJsonForSaving(); // This call is removed
}

function attachEventListenersToButtons() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.removeEventListener('click', handleEditPlant);
        button.addEventListener('click', handleEditPlant);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.removeEventListener('click', handleDeletePlant);
        button.addEventListener('click', handleDeletePlant);
    });
}

// showJsonForSaving function is completely removed.

async function handleFormSubmit(event) {
    event.preventDefault();

    if (!nameInput.value.trim() || !w3wInput.value.trim()) {
        alert('Please provide at least a Name and What3Words address.');
        return;
    }

    const idToUpdate = plantIdInput.value;

    // Object to hold data from form for Supabase
    const plantDataPayload = {
        name: nameInput.value.trim(),
        type: typeInput.value,
        w3w: w3wInput.value.trim(),
        area: areaInput.value.trim() || null,             // ADD THIS
        town: townInput.value.trim() || null,             // ADD THIS
        ripens: ripensInput.value.trim() || null,
        harvestMonth: harvestMonthInput.value.trim() || null,
        notes: notesInput.value.trim() || null
    };

    if (idToUpdate) {
        // UPDATE EXISTING PLANT
        if (!supabaseClient) { alert("Database connection not available."); return; }
        console.log(`Updating plant with ID ${idToUpdate} in Supabase...Data:`, plantDataPayload);
        try {
            const { data, error } = await supabaseClient
                .from('plants')
                .update(plantDataPayload) // Use the augmented object
                .eq('id', idToUpdate)
                .select();
            // ... (rest of update success/error logic, modal hide, loadPlants)
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
        // ADD NEW PLANT
        if (!supabaseClient) { alert("Database connection not available."); return; }
        console.log("Adding new plant to Supabase...Data:", plantDataPayload);
        try {
            const {data, error} = await supabaseClient
                .from('plants')
                .insert([plantDataPayload]) // Use the augmented object
                .select();
            // ... (rest of add success/error logic, modal hide, form reset, loadPlants)
            if (error) {
                console.error('Error adding plant:', error); alert(`Error saving plant: ${error.message}`);
            } else {
                await loadPlants();
                plantForm.reset(); // Reset form after successful add
                plantIdInput.value = ''; // Ensure ID is clear
                if (plantModalInstance) plantModalInstance.hide();
            }
        } catch (e) {
            console.error('Unexpected error saving plant:', e);
            alert('An unexpected error occurred while saving the plant.');
        }
    }
}

async function handleEditPlant(event) { // Making it async for consistency, though not strictly needed if no awaits inside
    const id = event.target.dataset.id;
    if (!id) {
        console.error("Edit button clicked but no ID found.");
        alert("Cannot edit: Plant ID not found.");
        return;
    }

    const plantToEdit = plants.find(p => p.id.toString() === id);

    if (plantToEdit) {
        console.log("Editing plant:", plantToEdit);
        // Populate the form fields (which are now in the modal)
        if (formTitle) formTitle.textContent = 'Edit Plant';
        plantIdInput.value = plantToEdit.id;
        nameInput.value = plantToEdit.name;
        typeInput.value = plantToEdit.type;
        w3wInput.value = plantToEdit.w3w;
        areaInput.value = plantToEdit.area || '';         // ADD THIS
        townInput.value = plantToEdit.town || '';         // ADD THIS
        ripensInput.value = plantToEdit.ripens || '';
        harvestMonthInput.value = plantToEdit.harvestMonth || '';
        notesInput.value = plantToEdit.notes || '';

        // Show the modal
        if (plantModalInstance) {
            plantModalInstance.show();
        } else {
            console.error("plantModalInstance not available to show modal for edit.");
            alert("Error: Could not open edit form.");
        }
        // Focus might be better handled by 'shown.bs.modal' if needed for edits
    } else {
        console.error("Plant to edit not found in array. ID:", id);
        alert("Error: Could not find the plant to edit.");
    }
}

/**
 * Handles deleting a plant after confirmation.
 */
async function handleDeletePlant(event) {
    const idToDelete = event.target.dataset.id;
    if (!idToDelete) {
        console.error("Delete button clicked but no ID found.");
        alert("Cannot delete: Plant ID not found.");
        return;
    }

    // Find the plant in the current local 'plants' array to get its name for the confirmation dialog.
    // This assumes 'plants' array is reasonably up-to-date from previous loadPlants() calls.
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
                .eq('id', idToDelete); // Specify which row to delete

            if (error) {
                console.error('Error deleting plant from Supabase:', error);
                alert(`Error deleting plant: ${error.message}`);
            } else {
                console.log('Plant deleted successfully from Supabase. ID:', idToDelete);
                // alert('Plant deleted successfully!'); // Optional success message

                // If the plant deleted was the one currently in the edit form, reset the form.
                if (plantIdInput.value === idToDelete) {
                    plantForm.reset();
                    plantIdInput.value = '';
                    if (formTitle) formTitle.textContent = 'Add New Plant';
                    nameInput.focus(); // Or simply ensure form is cleared
                }

                await loadPlants(); // Refresh the list from Supabase
            }
        } catch (catchError) {
            console.error('Unexpected error deleting plant:', catchError);
            alert('An unexpected error occurred while deleting the plant.');
        }
    } else {
        console.log("Deletion cancelled by user. ID:", idToDelete);
    }
}

/**
 * Handles the success callback for geolocation and then fetches W3W address.
 * @param {GeolocationPosition} position
 */
async function geolocationSuccess(position) { // Made async
    console.log('Geolocation successful:', position);
    const { latitude, longitude } = position.coords;
    console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);

    // Construct W3W API URL
    const w3wApiUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude}%2C${longitude}&key=${W3W_API_KEY}`;

    try {
        const response = await fetch(w3wApiUrl);
        if (!response.ok) {
            // Try to get more specific error from W3W API response if possible
            let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorMsg = `W3W API Error: ${errorData.error.message}`;
                }
            } catch (jsonError) {
                // Ignore if response isn't JSON or further error occurs
                console.warn("Could not parse W3W error response as JSON:", jsonError);
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data && data.words) {
            w3wInput.value = data.words;
            alert('What3Words address fetched successfully!'); // Or a more subtle notification
        } else {
            console.error('Error: W3W API response did not contain words.', data);
            alert('Could not retrieve a valid What3Words address. Response might be malformed.');
        }
    } catch (error) {
        console.error('Error fetching What3Words address:', error);
        alert(`Failed to fetch What3Words address: ${error.message}`);
    } finally {
        // Re-enable the button whether W3W fetch succeeded or failed
        if (getW3wLocationBtn) {
            getW3wLocationBtn.disabled = false;
            getW3wLocationBtn.innerHTML = originalW3wButtonIconHTML; // Restore original icon
        }
    }
}

/**
 * Handles the error callback for geolocation.
 * @param {GeolocationPositionError} error
 */
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
    // Re-enable the button if geolocation itself failed
    if (getW3wLocationBtn) {
        getW3wLocationBtn.disabled = false;
        getW3wLocationBtn.innerHTML = originalW3wButtonIconHTML; // Restore original icon
    }
}

/**
 * Initiates the process of fetching geolocation and then the What3Words address.
 */
async function fetchAndSetW3WAddress() { // This was already async, which is fine.
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    if (!getW3wLocationBtn) return; // Should not happen if button is part of UI

    console.log('Requesting geolocation...');
    // Store original icon HTML if not already stored (e.g. if button content could change by other means)
    // However, originalW3wButtonIconHTML is set in DOMContentLoaded, so it should be fine.
    getW3wLocationBtn.disabled = true;
    getW3wLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Change to spinner

    navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
    // Note: The button is re-enabled within geolocationSuccess (finally block) and geolocationError.
}

// ... (Rest of the script: DOMContentLoaded, other functions)
document.addEventListener('DOMContentLoaded', () => {
    if (plantFormModalElement) {
        plantModalInstance = new bootstrap.Modal(plantFormModalElement);

        plantFormModalElement.addEventListener('show.bs.modal', function (event) {
            // event.relatedTarget is the button that triggered the modal
            const triggerButton = event.relatedTarget;
            console.log("Modal triggered by:", triggerButton);

            // If triggered by the "Add New Plant" navbar button, or if no plantId is set (e.g. after an edit)
            // This ensures it's a clean form for adding.
            // The `handleEditPlant` function will be responsible for setting plantId for edits BEFORE showing the modal.

            // Check if the trigger is the "Add New Plant" button specifically by checking its attributes/content
            // or more simply, if plantIdInput.value is empty, assume it's for adding a new plant.
            // handleEditPlant will set plantIdInput.value *before* manually showing the modal.
            if (!plantIdInput.value) {
                console.log("Configuring modal for ADD NEW PLANT");
                if (formTitle) formTitle.textContent = 'Add New Plant';
                // plantIdInput.value = ''; // Already ensured by the condition
                plantForm.reset();     // Reset all form fields
            }
            // If plantIdInput.value ALREADY has a value here, it means handleEditPlant has populated it,
            // and the title should also have been set by handleEditPlant. So we don't reset.
        });

        // Optional: handle 'shown.bs.modal' for autofocus
        plantFormModalElement.addEventListener('shown.bs.modal', function () {
            if (!plantIdInput.value) { // Only focus on name for new plants
                if (nameInput) nameInput.focus();
            }
            // If it's an edit, handleEditPlant could set focus to nameInput as well.
        });

    } else {
        console.error("plantFormModalElement not found!");
    }

    if (plantForm) {
        plantForm.addEventListener('submit', handleFormSubmit);
    }

    if (getW3wLocationBtn) {
        originalW3wButtonIconHTML = getW3wLocationBtn.innerHTML; // Store the initial icon
        getW3wLocationBtn.addEventListener('click', fetchAndSetW3WAddress);
    } else {
        console.warn("getW3wLocationBtn not found.");
    }

    if (supabaseClient) { // Only call loadPlants if Supabase initialized correctly
        loadPlants();
    } else {
        console.warn("Supabase client not initialized. Data loading will be skipped.");
        if(plantsListContainer) plantsListContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error: Could not connect to data service. Please check console.</p></div>';
    }
});

console.log("script.js processed, Supabase client initialized (or attempted).");
