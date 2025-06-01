// Global array to store plant data
let plants = [];

// DOM Elements
const plantsListContainer = document.getElementById('plantsListContainer');
const formTitle = document.getElementById('formTitle');
const plantForm = document.getElementById('plantForm');
const plantIdInput = document.getElementById('plantId');
const nameInput = document.getElementById('name');
const typeInput = document.getElementById('type');
const w3wInput = document.getElementById('w3w');
const ripensInput = document.getElementById('ripens');
const harvestMonthInput = document.getElementById('harvestMonth');
const notesInput = document.getElementById('notes');
const jsonDataOutput = document.getElementById('jsonDataOutput');


async function loadPlants() {
    try {
        const response = await fetch('plants.json?_=' + new Date().getTime());
        if (!response.ok) {
            plants = [];
            console.warn("plants.json not found or error loading. Starting with an empty list.");
        } else {
            const data = await response.json();
            if (Array.isArray(data)) {
                plants = data;
            } else {
                plants = [];
                console.warn("plants.json does not contain a valid array. Starting with an empty list.");
            }
        }
    } catch (error) {
        console.error("Could not load plants:", error);
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

    if (plants.length === 0) {
        plantsListContainer.innerHTML = '<div class="col-12"><p>No plants tracked yet. Add one using the form!</p></div>';
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
                                <strong>W3W:</strong> <a href="https://what3words.com/${cardW3W.replace(/\/\/\//g, '')}" target="_blank">${cardW3W || 'N/A'}</a><br>
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
    showJsonForSaving();
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

function showJsonForSaving() {
    if (!jsonDataOutput) return;
    jsonDataOutput.value = JSON.stringify(plants, null, 2);
    jsonDataOutput.scrollTop = 0;
}

function handleFormSubmit(event) {
    event.preventDefault();

    if (!nameInput.value.trim() || !w3wInput.value.trim()) {
        alert('Please provide at least a Name and What3Words address.');
        return;
    }

    const id = plantIdInput.value;

    const plantData = {
        name: nameInput.value.trim(),
        type: typeInput.value,
        w3w: w3wInput.value.trim(),
        ripens: ripensInput.value.trim(),
        harvestMonth: harvestMonthInput.value.trim(),
        notes: notesInput.value.trim()
    };

    if (id) {
        const index = plants.findIndex(p => p.id.toString() === id);
        if (index !== -1) {
            plants[index] = { ...plants[index], ...plantData };
        } else {
            alert("Error: Plant to update not found.");
            return; // Do not reset form if update failed critically
        }
    } else {
        plantData.id = Date.now();
        plants.push(plantData);
    }

    renderPlants();
    plantForm.reset();
    plantIdInput.value = '';
    if (formTitle) formTitle.textContent = 'Add New Plant';
    nameInput.focus();
}

function handleEditPlant(event) {
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
function handleDeletePlant(event) {
    const id = event.target.dataset.id;
    if (!id) {
        console.error("Delete button clicked but no ID found.");
        return;
    }

    const plantToDelete = plants.find(p => p.id.toString() === id);
    if (!plantToDelete) {
        alert("Error: Plant to delete not found. It might have already been deleted.");
        return;
    }

    // Confirmation dialog
    if (window.confirm(`Are you sure you want to delete "${plantToDelete.name}"?`)) {
        plants = plants.filter(plant => plant.id.toString() !== id);
        console.log("Plant deleted. ID:", id);

        renderPlants(); // Re-render the list, which also calls showJsonForSaving

        // If the plant being edited was the one deleted, reset the form
        if (plantIdInput.value === id) {
            plantForm.reset();
            plantIdInput.value = ''; // Clear the hidden ID
            if (formTitle) formTitle.textContent = 'Add New Plant'; // Reset title
            if (nameInput) nameInput.focus(); // Optional: focus back to name input
        }
    } else {
        console.log("Deletion cancelled by user. ID:", id);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (plantForm) {
        plantForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error("plantForm not found on DOMContentLoaded. Form submission will not work.");
    }
    loadPlants();
});

console.log("script.js processed, delete functionality implemented.");
