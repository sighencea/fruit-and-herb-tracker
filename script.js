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

// DOM Elements
const plantsListContainer = document.getElementById('plantsListContainer');
const formTitle = document.getElementById('formTitle');
const plantForm = document.getElementById('plantForm');
const plantIdInput = document.getElementById('plantId'); // Hidden input for ID
const nameInput = document.getElementById('name');
const typeInput = document.getElementById('type');
const w3wInput = document.getElementById('w3w');
const ripensInput = document.getElementById('ripens');
const harvestMonthInput = document.getElementById('harvestMonth');
const notesInput = document.getElementById('notes');
// jsonDataOutput is removed

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

    const idToUpdate = plantIdInput.value; // Get the ID of the plant to update

    const plantDataForUpdate = {
        name: nameInput.value.trim(),
        type: typeInput.value,
        w3w: w3wInput.value.trim(),
        ripens: ripensInput.value.trim() || null,
        harvestMonth: harvestMonthInput.value.trim() || null,
        notes: notesInput.value.trim() || null
        // DO NOT include 'id' in the update payload itself, it's used in .eq()
    };

    if (idToUpdate) {
        // UPDATE EXISTING PLANT in Supabase
        if (!supabaseClient) {
            alert("Database connection not available. Cannot update plant.");
            return;
        }
        console.log(`Updating plant with ID ${idToUpdate} in Supabase:`, plantDataForUpdate);
        try {
            const { data, error } = await supabaseClient
                .from('plants')
                .update(plantDataForUpdate)
                .eq('id', idToUpdate) // Specify which row to update
                .select(); // Optionally .select() to get the updated row(s) back

            if (error) {
                console.error('Error updating plant in Supabase:', error);
                alert(`Error updating plant: ${error.message}`);
            } else {
                console.log('Plant updated successfully in Supabase:', data);
                // alert('Plant updated successfully!'); // Optional success message
                await loadPlants(); // Refresh the list from Supabase

                // Reset form to "Add New Plant" state
                plantForm.reset();
                plantIdInput.value = ''; // Clear the hidden ID
                if (formTitle) formTitle.textContent = 'Add New Plant';
                nameInput.focus();
            }
        } catch (catchError) {
            console.error('Unexpected error updating plant:', catchError);
            alert('An unexpected error occurred while updating the plant.');
        }
    } else {
        // ADD NEW PLANT to Supabase (already implemented from previous step)
        if (!supabaseClient) {
            alert("Database connection not available. Cannot save new plant.");
            return;
        }
        console.log("Adding new plant to Supabase:", plantDataForUpdate); // Re-using variable name, context is fine
        try {
            const { data, error } = await supabaseClient
                .from('plants')
                .insert([plantDataForUpdate]) // Supabase expects an array for insert
                .select();

            if (error) {
                console.error('Error adding plant to Supabase:', error);
                alert(`Error saving plant: ${error.message}`);
            } else {
                console.log('Plant added successfully to Supabase:', data);
                await loadPlants();
                plantForm.reset();
                nameInput.focus();
            }
        } catch (catchError) {
            console.error('Unexpected error saving plant:', catchError);
            alert('An unexpected error occurred while saving the plant.');
        }
    }
}

async function handleEditPlant(event) {
    const id = event.target.dataset.id;
    if (!id) return;

    const plantToEdit = plants.find(p => p.id.toString() === id);

    if (plantToEdit) {
        if (formTitle) formTitle.textContent = 'Edit Plant';
        plantIdInput.value = plantToEdit.id;
        nameInput.value = plantToEdit.name;
        typeInput.value = plantToEdit.type;
        w3wInput.value = plantToEdit.w3w;
        ripensInput.value = plantToEdit.ripens || '';
        harvestMonthInput.value = plantToEdit.harvestMonth || '';
        notesInput.value = plantToEdit.notes || '';
        nameInput.focus();
        if (plantForm) plantForm.scrollIntoView({ behavior: 'smooth' });
    } else {
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

document.addEventListener('DOMContentLoaded', () => {
    if (plantForm) {
        plantForm.addEventListener('submit', handleFormSubmit);
    }
    // loadPlants will be called, which currently just clears and calls render.
    // Actual data loading from Supabase will be in the modified loadPlants.
    if (supabaseClient) { // Only call loadPlants if Supabase initialized correctly
        loadPlants();
    } else {
        console.warn("Supabase client not initialized. Data loading will be skipped.");
        if(plantsListContainer) plantsListContainer.innerHTML = '<div class="col-12"><p class="text-danger">Error: Could not connect to data service. Please check console.</p></div>';
    }
});

console.log("script.js processed, Supabase client initialized (or attempted).");
