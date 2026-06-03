# Contract Generation Design

## Overview
This feature moves contract generation from AppSheet into the Prodeklarant app. Admin users will be able to upload a `.docx` template. When needed, users can generate a contract for a specific client directly from the app. The system will fill the template with data from the Client and CompanySettings records, save the generated `.docx` file, and provide a download link.

## 1. Templates Management
- **UI:** A section in settings/admin panel where the administrator can upload a standard `.docx` template file.
- **Backend:** The uploaded template is stored on the server (e.g., in `uploads/templates/` folder). A reference to the active template will be stored in the database or server filesystem.
- **Placeholders:** The template will use predefined tags recognized by the backend, such as `{clientName}`, `{clientInn}`, `{companyName}`, `{companyAddress}`, etc.

## 2. Contract Generation Flow
- **UI (Frontend):** 
  - A "Contracts" (Shartnomalar) page will be created or updated.
  - Users will have a "Generate Contract" (Shartnoma yaratish) button.
  - A modal/dialog will let the user select a Client from the database.
  - Upon clicking "Generate", the app makes an API call to the backend.
- **Result:** The user will see the newly generated contract in the Contracts list and can click to download the `.docx` file.

## 3. Backend Processing (Node.js)
- **Library:** `docxtemplater` alongside `pizzip` will be used to read the `.docx` template and replace placeholders natively.
- **Data Gathering:** The backend will fetch:
  1. The selected `Client` data.
  2. The `CompanySettings` data (for the enterprise's own details).
- **Generation:** Placeholders in the template are replaced with actual data.
- **Storage:** The resulting `.docx` file is saved to the server's filesystem (e.g., `uploads/contracts/`).
- **Database Link:** A new `Contract` record is created (or an existing one updated) with the file path added to the `files` JSON array so it can be retrieved later.

## 4. Error Handling
- If no template is uploaded, the API will return a 400 error prompting the admin to upload a template.
- If placeholders don't match or the file is corrupted, appropriate error messages will be surfaced to the UI.

## 5. Scope & Future Extensions
- This iteration only supports `.docx` generation. Future iterations might include PDF conversion if required.
- Multiple contract templates can be added in the future, but V1 will focus on a primary default template.
