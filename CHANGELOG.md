# Changelog

This document outlines the changes made during the conversion of the PHP frontend to a modern React application.

## 1. Project Conversion: PHP to React

The entire PHP-based frontend has been successfully migrated to a React (Vite + TypeScript) application. The new frontend connects to the existing PHP backend, with all backend URLs now managed through a central `.env` file.

### Key Changes:

-   **Framework:** Replaced native PHP frontend with a React single-page application (SPA).
-   **Language:** Converted all PHP files to TypeScript `.tsx` components.
-   **Environment:** Centralized backend URL configuration in `frontend/.env` under `REACT_APP_API_BASE_URL`.
-   **State Management:** Replaced PHP session/request logic with React state (`useState`, `useEffect`) and component props.
-   **Routing:** Implemented client-side routing with `react-router-dom`, creating separate layouts and routes for the User and Admin sections.

## 2. File Conversions & Deletions

### User-Facing App (`frontend/src/user`)
-   `pages/marketplace.php` -> `pages/Marketplace.tsx`
-   `components/header.php` -> `components/Header.tsx`
-   `components/footer.php` -> `components/Footer.tsx`
-   `components/sidebar.php` -> `components/Sidebar.tsx`
-   `components/modal_about.php` -> `components/AboutModal.tsx`
-   `components/modal_author.php` -> `components/AuthorModal.tsx`
-   `components/modal_blog.php` -> `components/BlogModal.tsx`
-   `components/modal_contact.php` -> `components/ContactModal.tsx`
-   `components/modal_preview.php` -> `components/PreviewModal.tsx`
-   `components/notification.php` -> Deleted (Replaced with `react-toastify`).
-   `assets/js/script.js` -> Deleted (Logic migrated into components).
-   `assets/js/toast.js` -> Deleted.

### Admin Panel (`frontend/src/admin`)
-   `index.php` -> `index.tsx` & `pages/Dashboard.tsx`
-   `pages/payments.php` -> `pages/PaymentsPage.tsx`
-   `pages/website_config.php` -> `pages/WebsiteConfigPage.tsx`
-   `components/admin_header.php` -> `components/AdminHeader.tsx`
-   `components/alerts.php` -> Deleted (Replaced with `react-toastify`).
-   `components/get_payment_details.php` -> Deleted (Functionality moved to a proper backend endpoint).
-   `assets/js/admin.js` -> Deleted (Logic migrated into components).
-   `assets/js/website_config.js` -> Deleted.
-   `assets/js/google-config.js` -> Deleted.
-   `assets/js/toast.js` -> Deleted.

### Payments Flow (`frontend/src/payments`)
-   `modal_purchase.php` -> `PurchaseModal.tsx` (Merged two UI structures and migrated all JS logic).
-   `assets/js/main.js` -> Deleted (Logic migrated into component).
-   `assets/js/errorStates.js` -> Deleted.

## 3. Backend & Database

-   **Payments DB Merge:** Merged `payments.sql` and `paymentss.sql` into a single, updated `merged_payments.sql`. The new schema is based on the Paystack implementation but includes additional frontend-facing fields. The original two files were deleted.
-   **API Base URL:** All frontend `fetch`/`axios` calls now correctly point to the `REACT_APP_API_BASE_URL`.

## 4. Routing & Navigation

-   **React Router:** Implemented `react-router-dom` v6.
-   **User Routes:** All user pages are prefixed with `/user` (e.g., `/user/marketplace`).
-   **Admin Routes:** All admin pages are prefixed with `/admin` (e.g., `/admin/payments`).
-   **Layouts:** Created `UserLayout.tsx` and `AdminLayout.tsx` to provide consistent structure for each section.
-   **404 Page:** Added a catch-all route for unmatched paths.

## 5. Key Feature Migrations

-   **Payment Modal:** The complex logic from `main.js`, including internet connection checks, auto-retry functionality, and Paystack reference handling, has been carefully preserved and migrated into the `PurchaseModal.tsx` component using React hooks.
-   **Notifications:** The simple `toast.js` system has been upgraded to `react-toastify` for a more robust and modern notification experience.
-   **DOM Manipulation:** All direct DOM manipulation from the old `.js` files has been replaced with modern React state management, making the application more predictable and maintainable.
