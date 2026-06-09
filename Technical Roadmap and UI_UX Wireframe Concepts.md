# Technical Roadmap and UI/UX Wireframe Concepts

This document outlines the technical roadmap and UI/UX wireframe concepts for integrating the new person-centric tracking features, including proxy payments, informal loans, and the credit card debt allocator, into the existing financial application.

## 1. Technical Roadmap

### Phase 1: Backend Data Model and API Development (Weeks 1-4)

*   **Objective:** Implement the `Person` and `AssignedCreditCardDebt` entities and associated relationships in the database.
*   **Tasks:**
    *   **Database Schema Updates:** Modify the existing database schema to include `Person` and `AssignedCreditCardDebt` tables as defined in the `person_centric_data_model.md` and `credit_card_debt_allocator_design.md` documents.
    *   **API Endpoints for Persons:** Develop RESTful API endpoints for creating, reading, updating, and deleting `Person` records.
    *   **API Endpoints for Assigned Debts:** Develop RESTful API endpoints for managing `AssignedCreditCardDebt` records, including creation, updates, and retrieval.
    *   **Transaction Linking:** Implement logic to link `Transaction` and `CreditCardTransaction` records to `Person` and `AssignedCreditCardDebt` entities.
    *   **Interest/Fee Calculation Logic:** Develop backend services to calculate and attribute proportional interest and fees for assigned credit card debts.
    *   **Unit and Integration Testing:** Write comprehensive tests for all new data models and API endpoints.

### Phase 2: Frontend UI/UX Implementation (Weeks 5-8)

*   **Objective:** Develop the user interface components and integrate them with the new backend APIs.
*   **Tasks:**
    *   **Person Management UI:** Create screens for adding, viewing, and editing `Person` profiles.
    *   **Informal Loan/Borrow Tracking UI:** Develop UI components for recording and managing informal loans and borrowings with friends/family, linking them to `Person` entities.
    *   **Credit Card Debt Allocation UI:** Implement the user interface for assigning credit card debt to individuals, including input forms and display of allocated amounts, interest, and fees.
    *   **EMI/Loan Tracking Enhancements:** Modify existing EMI and loan tracking interfaces to allow linking payments to specific `Person` entities.
    *   **Reporting and Dashboards:** Create new dashboard widgets or dedicated report pages to visualize person-centric financial data, including outstanding balances, payment histories, and accrued costs.
    *   **Frontend Testing:** Conduct thorough testing of all new UI components and their integration with the backend.

### Phase 3: Advanced Features and Refinements (Weeks 9-12)

*   **Objective:** Introduce advanced functionalities and refine existing features based on user feedback.
*   **Tasks:**
    *   **Notifications and Reminders:** Implement push notifications or email reminders for upcoming EMI payments, loan repayments, and credit card due dates, especially for assigned debts.
    *   **Automated Reconciliation:** Explore options for automated reconciliation of payments against assigned debts.
    *   **Data Import/Export:** Provide functionality to import and export person-centric financial data.
    *   **Performance Optimization:** Optimize database queries and API responses for improved performance.
    *   **Security Enhancements:** Review and strengthen security measures for sensitive financial data.

## 2. UI/UX Wireframe Concepts

### A. Person Profile Screen

*   **Purpose:** A central hub for managing all financial interactions with a specific person.
*   **Elements:**
    *   **Header:** Person's Name, Profile Picture (optional).
    *   **Summary:** Total amount owed *to* the user, total amount owed *by* the user.
    *   **Sections:**
        *   **Loans Given:** List of informal loans provided to this person (amount, date, expected return date, status).
        *   **Loans Taken:** List of informal loans taken from this person (amount, date, expected repayment date, status).
        *   **Proxy Payments:** List of EMIs or other expenses paid on behalf of this person (type, amount, date, status).
        *   **Credit Card Debt Allocation:** Details of credit card debt assigned to this person (initial amount, current principal, accrued interest, fees).
    *   **Actions:** Buttons for 
