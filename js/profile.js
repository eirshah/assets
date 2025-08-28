// profile.js

// Google Apps Script URL for saving remotely (optional)
const webAppUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
const enableRemoteSave = false; // toggle to true if remote save is allowed

const profileFieldsList = [
  "currently_living","unique_id","foolhumaa_form_number","beneficiary_national_id",
  "beneficiary_name","dob","sex","island_residence","current_address",
  "mother_name","mother_national_id","primary_contact","caregiver_name",
  "caregiver_id","caregiver_contact","country","birth_weight"
];

const dropdownOptions = {
  sex: ["Male", "Female", "Other"],
  currently_living: ["Yes", "No"],
  country: ["Maldives", "India", "Sri Lanka", "Other"]
};

let originalData = {}; 
let childId = "";

// Notification banner
function showNotice(message, type="info") {
  const note = document.getElementById("notification");
  note.innerText = message;
  note.className = `mb-4 p-3 rounded-lg font-medium ${
    type === "success" ? "bg-green-500 text-white" :
    type === "error"   ? "bg-red-500 text-white" :
    type === "warning" ? "bg-yellow-500 text-black" : 
                         "bg-blue-500 text-white"
  }`;
  note.classList.remove("hidden");
  setTimeout(()=> note.classList.add("hidden"), 4000);
}

// Get child ID from URL (?id=...)
function getChildIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "default_child";
}

// Render profile fields
function renderProfile(child, editable=false){
  const container = document.getElementById("profileContainer");
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  profileFieldsList.forEach(key => {
    const labelText = key.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
    const value = child[key] || "";

    const fieldDiv = document.createElement("div");
    fieldDiv.className = "flex items-center space-x-4";

    if(editable && dropdownOptions[key]){
      const optionsHtml = dropdownOptions[key].map(opt => 
        `<option value="${opt}" ${opt===value?'selected':''}>${opt}</option>`).join("");
      fieldDiv.innerHTML = `
        <label class="w-1/3 font-semibold text-gray-700">${labelText}:</label>
        <select data-key="${key}" class="border border-gray-300 rounded-md p-2 w-2/3 bg-white">
          ${optionsHtml}
        </select>
      `;
    } else {
      fieldDiv.innerHTML = `
        <label class="w-1/3 font-semibold text-gray-700">${labelText}:</label>
        <input type="text" value="${value}" data-key="${key}" 
          class="border border-gray-300 rounded-md p-2 w-2/3 ${editable ? 'bg-white' : 'bg-gray-50'}"
          ${editable ? '' : 'readonly'} />
      `;
    }

    fragment.appendChild(fieldDiv);
  });

  container.appendChild(fragment);
}

// Load profile from localStorage
function loadProfile(){
  childId = getChildIdFromURL();
  const cacheKey = "childProfile_" + childId;
  const cached = localStorage.getItem(cacheKey);

  if(cached){
    originalData = JSON.parse(cached);
    renderProfile(originalData);
    showNotice("Loaded profile from local storage.", "info");
  } else {
    originalData = {};
    profileFieldsList.forEach(f => originalData[f] = "");
    renderProfile(originalData);
    showNotice("New profile initialized.", "info");
  }
}

// Edit button
document.getElementById("editProfileBtn").addEventListener("click", ()=>{
  renderProfile(originalData, true);
  document.getElementById("editProfileBtn").classList.add("hidden");
  document.getElementById("saveProfileBtn").classList.remove("hidden");
  document.getElementById("cancelProfileBtn").classList.remove("hidden");
  showNotice("Editing mode enabled.", "warning");
});

// Cancel button
document.getElementById("cancelProfileBtn").addEventListener("click", ()=>{
  renderProfile(originalData, false);
  document.getElementById("editProfileBtn").classList.remove("hidden");
  document.getElementById("saveProfileBtn").classList.add("hidden");
  document.getElementById("cancelProfileBtn").classList.add("hidden");
  showNotice("Changes discarded.", "info");
});

// Save button
document.getElementById("saveProfileBtn").addEventListener("click", async ()=>{
  const container = document.getElementById("profileContainer");
  const inputs = container.querySelectorAll("input, select");

  const payload = {};
  inputs.forEach(input => { payload[input.dataset.key] = input.value; });

  originalData = {...payload};
  localStorage.setItem("childProfile_" + childId, JSON.stringify(originalData));
  renderProfile(originalData, false);

  document.getElementById("editProfileBtn").classList.remove("hidden");
  document.getElementById("saveProfileBtn").classList.add("hidden");
  document.getElementById("cancelProfileBtn").classList.add("hidden");

  showNotice("Changes saved locally!", "success");

  if(enableRemoteSave && webAppUrl){
    try {
      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", key: childId, data: payload })
      });
      const result = await response.json();
      showNotice(result.message || "Saved remotely!", "success");
    } catch(err){
      console.error(err);
      showNotice("Remote save failed.", "error");
    }
  }
});

window.onload = loadProfile;
