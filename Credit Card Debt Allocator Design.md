# Credit Card Debt Allocator Design

## 1. Feature Overview

The 'Credit Card Debt Allocator' feature aims to provide a granular view of credit card debt, specifically addressing scenarios where a portion of the credit card balance is attributed to another individual (e.g., a loan to a brother). This feature will track the principal amount, accrued interest, and any associated fees, allowing the user to understand the true cost of the proxy debt.

## 2. Core Functionality

*   **Debt Assignment:** Users can assign a specific amount of their credit card balance to another person (e.g., "Brother's Loan").
*   **Interest and Fee Tracking:** The system will calculate and attribute a proportional share of the credit card's monthly interest and fees to the assigned debt.
*   **Payment Allocation:** When a payment is made to the credit card, users can specify how much of that payment should be allocated to the assigned debt.
*   **Historical View:** Maintain a history of the assigned debt, including initial amount, payments made, and accrued interest/fees.
*   **Reporting:** Generate reports showing the current outstanding balance for each assigned debt, including principal, interest, and fees.

## 3. Data Model Enhancements

To support this feature, the existing data model will need to be extended. A new entity, `AssignedCreditCardDebt`, could be introduced, linked to both the `CreditCard` and `Person` entities.

### `AssignedCreditCardDebt` Entity

| Field Name          | Data Type | Description                                                                   |
| :------------------ | :-------- | :---------------------------------------------------------------------------- |
| `id`                | UUID      | Unique identifier for the assigned debt.                                      |
| `credit_card_id`    | UUID      | Foreign key linking to the `CreditCard` entity.                               |
| `person_id`         | UUID      | Foreign key linking to the `Person` entity (the individual owing the debt).   |
| `initial_amount`    | Decimal   | The initial amount of credit card debt assigned to the person.                |
| `current_principal` | Decimal   | The current outstanding principal amount of the assigned debt.                |
| `accrued_interest`  | Decimal   | Total interest accrued on this assigned debt.                                 |
| `accrued_fees`      | Decimal   | Total fees accrued on this assigned debt.                                     |
| `start_date`        | Date      | Date when the debt was initially assigned.                                    |
| `last_updated`      | Timestamp | Timestamp of the last update to this assigned debt.                           |
| `notes`             | Text      | Any additional notes or details about the assigned debt.                      |

### `CreditCardTransaction` Enhancements

The `CreditCardTransaction` entity would need to be updated to allow for allocation of payments and charges.

| Field Name          | Data Type | Description                                                                   |
| :------------------ | :-------- | :---------------------------------------------------------------------------- |\n| `assigned_debt_id`  | UUID      | Optional foreign key linking to `AssignedCreditCardDebt` if applicable.       |
| `allocation_amount` | Decimal   | Amount of this transaction (payment or charge) allocated to `assigned_debt_id`. |

## 4. Calculation Logic

### Proportional Interest/Fee Calculation

When credit card interest and fees are incurred, they will be distributed proportionally based on the outstanding balance of the assigned debt relative to the total credit card balance.

`Proportional Interest = (Assigned Debt Current Principal / Total Credit Card Balance) * Total Credit Card Interest`

`Proportional Fees = (Assigned Debt Current Principal / Total Credit Card Balance) * Total Credit Card Fees`

These proportional amounts will then be added to `accrued_interest` and `accrued_fees` for the respective `AssignedCreditCardDebt` record.

## 5. User Interface (UI) Considerations

*   **Credit Card Detail View:** A new section within the credit card details to manage assigned debts.
*   **Assign Debt Modal/Form:** A form to input the initial assigned amount, select the person, and add notes.
*   **Payment Allocation:** When recording a credit card payment, an option to allocate a portion of the payment to specific assigned debts.
*   **Assigned Debt Report:** A dedicated report or dashboard showing each person's assigned credit card debt, including principal, interest, and fees, and a history of transactions related to it.

## 6. Workflow Example

1.  **User:** Records a credit card charge of $35,000 for their brother.
2.  **System:** User assigns this $35,000 to 
