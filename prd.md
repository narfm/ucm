Here's a detailed **Product Requirements Document (PRD)** for your Angular-based website:

---

# **Product Requirements Document (PRD)**

## Project: Hierarchical Financial Data Dashboard

### **1. Overview**

The project is a web-based Angular application that displays hierarchical financial data in a high-performance data grid. The application supports light/dark themes, filtering, sorting, searching, and interactive hierarchy reshaping based on various business dimensions (Salesperson, Services, etc.).

---

### **2. Goals**

* Display up to 100K rows in a performant hierarchical data grid.
* Allow end users to explore, filter, and search through a large dataset.
* Support different hierarchy perspectives (Bank Name, Salesperson, Services).
* Offer intuitive UI/UX for power users (financial analysts, internal teams).

---

### **3. Functional Requirements**

#### **3.1 Header**

* **Left:** Company Logo.
* **Right:** User Icon with dropdown menu:

  * Option: Logout

#### **3.2 Theme Switcher**

* Toggle button in the header.
* Switch between **Light Mode** and **Dark Mode**.
* Use Angular theming (`@angular/material/theming` or similar).

#### **3.3 Data Grid**

* Full-page expandable/collapsible hierarchical data grid.
* Support for **lazy rendering** / **virtual scrolling** for 100K+ rows.

##### **Columns Include:**

* Sales Person
* Services
* Account Name
* Assets Under Custody
* Profit / Loss

##### **Features:**

* Each column should be:

  * **Searchable** (text input or dropdowns for filters).
  * **Sortable** (ascending/descending).
* Rows should support **expand/collapse** for nested hierarchy.

#### **3.4 Filters Section (Above Grid)**

* **Buttons:**

  * **Top 250**
  * **Top 1K**
  * **Search by Client Name** (textbox with debounce search)
* Filter affects the displayed data instantly.

#### **3.5 Hierarchy Toggle Section**

* **Default:** Hierarchy is by **Bank Name**.
* **Button 1: Group by Sales Person**

  * Dropdown to select a Sales Person.
  * Reorganizes hierarchy:

    ```
    Salesperson A
      - BNY
        - CITI
    ```
* **Button 2: Group by Service**

  * Dropdown to select:

    * Corporate Trust
    * Treasury
    * Custody
  * Reorganizes:

    ```
    Corporate Trust
      - BNY
        - Goldman
    ```

#### **3.6 Hierarchy Example**

```
BNY
  - Goldman
    - GS Asia
      - GS India
      - GS China
    - GS North America
      - USA
      - CANADA
  - CITI
  - State Street
```

Each row displays:
`Sales Person | Service | Account Name | Assets Under Custody | Profit/Loss`

---

### **4. Non-Functional Requirements**

* **Performance:** Should handle 100K rows with minimal lag.
* **Responsive:** Should work on desktops and tablets.
* **Accessibility:** ARIA compliant.
* **Security:** Auth-protected logout menu (JWT/session-based).

---

### **5. Mock Data Generator (Service)**

Angular service to generate **10,000 random hierarchical records**.

##### **Attributes:**

* Banks: `["BNY", "CITI", "State Street", "Goldman Sachs"]`
* Services: `["Corporate Trust", "Treasury", "Custody"]`
* Sales Persons: `["Alice", "Bob", "Charlie", "Diana"]`
* Regions: `["GS Asia", "GS North America", "Europe", "India", "China", "USA", "Canada"]`
* Account Name: Randomly generated
* Assets: Random number (1M – 10B)
* Profit/Loss: Random number (-10M to +10M)

##### **Structure:**

Create a tree with nested nodes:

```ts
interface DataNode {
  id: string;
  accountName: string;
  bankName: string;
  service: string;
  salesPerson: string;
  assetsUnderCustody: number;
  profitLoss: number;
  children?: DataNode[];
}
```

---

### **6. Tech Stack**

* **Frontend:** Angular 16+, Angular Material
* **State Management:** RxJS
* **Styling:** SCSS, Angular Material Themes
* **Mock Data:** Local service (custom random logic)

