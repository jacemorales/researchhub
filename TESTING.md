# Frontend Conversion Test Checklist

This checklist outlines the steps to verify that the conversion from PHP to React was successful and that all key functionality is working as expected.

## 1. Environment Setup

-   [ ] Verify that the `frontend/.env` file exists and contains the `REACT_APP_API_BASE_URL`.
-   [ ] Confirm that the backend is running and accessible at the URL specified in `.env`.
-   [ ] Run `npm install` or `yarn install` in the `frontend` directory to ensure all dependencies are installed.

## 2. Frontend Build & Execution

-   [ ] Run `npm run dev` or `yarn dev` in the `frontend` directory.
-   [ ] Verify that the application compiles and runs without any build errors.
-   [ ] Open the application in a browser. You should be redirected from `/` to `/user`.

## 3. User Flow Verification

-   [ ] **Homepage:** Navigate to `/user`. The main user layout should be visible, including the header, sidebar, and footer.
-   [ ] **Marketplace:** Navigate to `/user/marketplace`.
    -   [ ] Verify that the page fetches and displays a list of academic resources from the backend.
    -   [ ] Test the search bar to filter resources by name.
    -   [ ] Test the category dropdown to filter resources by category.
-   [ ] **Modals:**
    -   [ ] Click the "About", "Blog", and "Contact" links in the header. Verify that the corresponding modals open and close correctly.
    -   [ ] In the sidebar, click "View Full Profile". Verify that the author modal opens.
    -   [ ] On the marketplace page, click the "Preview" button on a resource. Verify that the preview modal opens with the correct information.

## 4. Payments Flow Verification

-   [ ] **Open Purchase Modal:** On the marketplace page, click the "Purchase" button on a resource.
    -   [ ] Verify that the purchase modal opens.
    -   [ ] Check that the file name and price are correctly displayed in the order summary.
    -   [ ] Confirm that the tax and fee calculations are displayed correctly.
-   [ ] **Initiate Purchase:**
    -   [ ] Fill in the customer name and email.
    -   [ ] Click the "Complete Purchase" button.
    -   [ ] Verify that the application shows a "Processing" or "Initializing" state.
    -   [ ] (Requires Backend) Check the network tab to confirm that a request is made to the `/payments/initialize.php` endpoint on the backend.
-   [ ] **(Optional) Full Payment Cycle:**
    -   [ ] If the backend is fully configured, this would involve being redirected to a payment provider and then being returned to a verification step.
    -   [ ] Verify that the polling mechanism for payment verification is working.
    -   [ ] Verify that a success or failure message is displayed correctly.

## 5. Admin Flow Verification

-   [ ] **Login:** Navigate to `/admin`.
    -   [ ] If not authenticated, you should see a "Sign in with Google" prompt.
    -   [ ] Verify that the link points to the correct Google OAuth URL.
-   [ ] **Dashboard:** After authenticating (this may need to be mocked or done with a live backend):
    -   [ ] Verify that a list of Google Drive files is fetched and displayed.
    -   [ ] Test the search functionality for the file list.
-   [ ] **File Details Form:**
    -   [ ] Click "Select" on a file.
    -   [ ] Verify that the file's details are populated in the form on the right.
    -   [ ] Fill in the remaining fields (description, category, price).
    -   [ ] Click "Save Details". Verify that a request is sent to the backend to save the data.
-   [ ] **Other Admin Pages:**
    -   [ ] Navigate to `/admin/payments`. Verify that the payments table loads.
    -   [ ] Navigate to `/admin/config`. Verify that the website configuration items are displayed.

## 6. General Checks

-   [ ] **Broken Links:** Click through all navigation links (header, sidebar, etc.) to ensure there are no broken routes.
-   [ ] **Asset Loading:** Verify that all images and icons are loading correctly.
-   [ ] **Console Errors:** Open the browser's developer console and check for any unexpected errors.
-   [ ] **Responsiveness:** Resize the browser window to check for basic mobile responsiveness.
