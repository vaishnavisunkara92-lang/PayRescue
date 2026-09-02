\# PayRescue



\## AI-Powered Payment Recovery and Decision-Support System



PayRescue is a payment recovery system built to help identify and recover failed digital payments.



Instead of treating every failed payment in the same way, PayRescue looks at the payment amount, customer type, and reason for failure. Based on these details, it calculates a recovery score, assigns a priority, and recommends an appropriate recovery action.



The system also tracks what happens after the recovery attempt and provides an explanation for why a particular recovery decision was made.



PayRescue is being developed for the \*\*Razorpay AI Buildathon 2026\*\*.



\---



\## The Problem



Failed payments are a common problem in digital payments.



When a payment fails, simply marking it as "failed" is not enough. Some payments can be recovered by retrying, some may need the customer to add funds, while others may require a different payment method.



If all failed payments are handled in the same way, businesses can:



\* Miss valuable recovery opportunities

\* Spend time on low-priority payments

\* Use the wrong recovery strategy

\* Provide a poor customer experience

\* Find it difficult to understand why a recovery decision was made



This is the problem PayRescue is designed to address.



\---



\## Our Approach



PayRescue turns a failed payment into a structured recovery decision.



The basic workflow is:



\*\*Failed Payment → Diagnosis → Recovery Score → Priority → Recommended Action → Recovery → Verification → Learning Result\*\*



For every payment, the system analyzes the available information and decides how important the payment is from a recovery perspective.



The dashboard then gives the user a simple view of the payment, its recovery opportunity, and the action that can be taken.



\---



\## What PayRescue Does



\### 1. Records Failed Payments



The system stores important payment details such as:



\* Payment ID

\* Payment amount

\* Payment status

\* Failure reason

\* Customer type

\* Creation time



This information is stored in a SQLite database.



\### 2. Diagnoses the Failure



PayRescue converts technical failure reasons into simple explanations.



Currently supported failure reasons include:



\* `insufficient\_funds`

\* `card\_declined`

\* `network\_error`

\* `timeout`



For example:



`insufficient\_funds`



becomes:



> Customer has insufficient funds



This makes the payment information easier to understand.



\### 3. Calculates a Recovery Score



Each failed payment receives a recovery score.



The score is based on three main factors:



\* Payment amount

\* Customer type

\* Failure reason



A higher score means the payment is considered a better recovery opportunity.



\### 4. Assigns Priority



Based on the recovery score, PayRescue assigns one of three priorities:



\* \*\*High\*\*

\* \*\*Medium\*\*

\* \*\*Low\*\*



This helps users focus on the most important recovery opportunities first.



\### 5. Recommends a Recovery Action



The system does not use the same recovery action for every failure.



For example:



\* Insufficient funds → Retry after the customer adds funds

\* Network error → Retry the payment

\* Timeout → Retry the payment

\* Card declined → Ask the customer to use another payment method



This makes the recovery process more targeted.



\### 6. Simulates Recovery



PayRescue can simulate the recommended recovery action.



For example, a retry action can be recorded as:



> Recovery attempt initiated



This allows the complete recovery workflow to be demonstrated without requiring a real payment gateway.



\### 7. Verifies the Recovery



After a recovery action is simulated, the system records the current verification state.



For example:



> Recovery pending verification



or



> Waiting for customer to retry



This helps track what happens after the recovery action.



\### 8. Records Learning Results



PayRescue also records information about the recovery strategy used.



For example:



> Recovery strategy recorded for future optimization



This creates a foundation for using historical recovery results in future versions of the system.



\### 9. Provides Explainable Decisions



One of the important parts of PayRescue is explainability.



The system does not simply show a score such as `90` and leave the user wondering why.



It explains the decision using factors such as:



\* Payment amount

\* Customer type

\* Failure reason

\* Recovery score

\* Priority

\* Recommended recovery approach



For example, the system can explain that a payment received a high priority because of its amount, customer type, and failure reason.



\### 10. Shows Recovery Analytics



The dashboard provides an overview of the payment recovery process.



It currently displays:



\* Total failed payments

\* Total failed amount

\* High-priority payments

\* Recovery rate

\* Recent failed payments



\---



\## Recovery Scoring Logic



The current version uses an explainable rule-based scoring system.



\### Payment Amount



| Payment Amount | Score |

| -------------- | ----: |

| ₹5000 or more  |   +40 |

| ₹2000 to ₹4999 |   +25 |

| Below ₹2000    |   +10 |



\### Customer Type



| Customer Type | Score |

| ------------- | ----: |

| Premium       |   +30 |

| Regular       |   +10 |



\### Failure Reason



| Failure Reason     | Score |

| ------------------ | ----: |

| Insufficient funds |   +20 |

| Network error      |   +15 |

| Timeout            |   +15 |

| Card declined      |    +5 |



\---



\## Priority Logic



The final recovery score determines the payment priority.



| Recovery Score | Priority |

| -------------- | -------- |

| 80 or above    | High     |

| 50 to 79       | Medium   |

| Below 50       | Low      |



This allows the dashboard to highlight the payments that may deserve more attention.



\---



\## Recovery Actions



The recommended action depends mainly on the reason the payment failed.



| Failure Reason     | Recommended Action                         |

| ------------------ | ------------------------------------------ |

| Insufficient funds | Retry after customer adds funds            |

| Network error      | Retry payment immediately                  |

| Timeout            | Retry payment                              |

| Card declined      | Ask customer to use another payment method |

| Other              | Manual review                              |



\---



\## Explainable AI



The current PayRescue system uses an \*\*explainable rule-based decision engine\*\*.



This is important because the current version does \*\*not\*\* claim to be a trained machine-learning model.



The decision engine uses known rules to calculate the recovery score and priority. It then generates a human-readable explanation for the decision.



For example, a payment may be explained using:



\* High payment amount

\* Premium customer

\* Recoverable failure reason

\* High recovery score

\* High priority



This makes the decision easier for a user to understand and trust.



\### Future AI Direction



A future version of PayRescue can use machine learning trained on historical payment and recovery outcomes.



Such a model could estimate the probability of successful recovery and help rank different recovery strategies.



This would allow the system to move from rule-based decision-making toward data-driven recovery optimization.



\---



\## How the System Works



The complete PayRescue workflow is:



\### Step 1 — Record the Payment



A failed payment is entered into the system.



\### Step 2 — Understand the Failure



The system identifies the reason for the payment failure.



\### Step 3 — Calculate Recovery Score



The payment amount, customer type, and failure reason are evaluated.



\### Step 4 — Assign Priority



The payment is classified as High, Medium, or Low priority.



\### Step 5 — Recommend an Action



The system selects a recovery action based on the failure reason.



\### Step 6 — Recover



The recovery action is simulated and recorded.



\### Step 7 — Verify



The system records the verification status.



\### Step 8 — Learn



The recovery strategy and result are recorded for future optimization.



\### Step 9 — Analyze



The dashboard updates the recovery statistics.



\---



\## Dashboard



The PayRescue frontend provides a simple dashboard for managing failed payments.



The dashboard includes:



\* Analytics cards

\* Add Payment form

\* Payment table

\* View Analysis option

\* Recovery button

\* Recovery information

\* AI explanation



The payment table is organized by recovery score so that higher recovery opportunities can be noticed quickly.



When a payment is analyzed, the user can see:



\* Diagnosis

\* Recovery Score

\* Priority

\* Recovery Action

\* Recovery Status

\* Verification Status

\* Learning Result

\* AI Explanation



\---



\## Example



Suppose a payment has the following details:



```text

Payment ID: PAY022

Amount: ₹8000

Customer Type: Premium

Failure Reason: insufficient\_funds

```



The system calculates:



```text

Amount points       = +40

Customer points     = +30

Failure reason     = +20

\--------------------------------

Recovery Score      = 90

Priority            = High

```



The system then recommends:



> Retry payment after the customer adds funds.



After the recovery process, the system can record the recovery status, verification status, and learning result.



This example shows how PayRescue converts raw payment failure information into an actionable recovery decision.



\---



\## Technology Stack



\### Backend



\* Python

\* FastAPI

\* Uvicorn

\* Pydantic

\* SQLite



\### Frontend



\* React

\* Vite

\* JavaScript

\* CSS



\### Development Tools



\* Visual Studio Code

\* Git

\* GitHub



\---



\## Project Structure



```text

PayRescue/

│

├── backend/

│   ├── main.py

│   ├── payrescue.db

│   └── venv/

│

├── frontend/

│   ├── src/

│   ├── package.json

│   └── ...

│

├── .gitignore

└── README.md

```



The `payrescue.db` database and Python virtual environment are used locally and are intentionally excluded from GitHub using `.gitignore`.



Other generated or unnecessary files such as `\_\_pycache\_\_` and `node\_modules` are also excluded.



\---



\## Running the Backend



Open \*\*CMD\*\* and go to the backend folder:



```cmd

cd /d C:\\Users\\vaishnavi\\OneDrive\\Documents\\PayRescue\\backend

```



Activate the virtual environment:



```cmd

venv\\Scripts\\activate

```



Start the FastAPI server:



```cmd

uvicorn main:app --reload

```



The backend will run at:



```text

http://127.0.0.1:8000

```



FastAPI provides interactive API documentation at:



```text

http://127.0.0.1:8000/docs

```



\---



\## Running the Frontend



Open a \*\*second CMD window\*\*.



Go to the frontend folder:



```cmd

cd /d C:\\Users\\vaishnavi\\OneDrive\\Documents\\PayRescue\\frontend

```



Start the Vite development server:



```cmd

npm.cmd run dev

```



The frontend normally opens at:



```text

http://localhost:5173/

```



If that port is already in use, Vite may automatically use another port such as `5174`.



\---



\## API Endpoints



| Method | Endpoint                | Purpose                            |

| ------ | ----------------------- | ---------------------------------- |

| GET    | `/`                     | Check whether PayRescue is running |

| POST   | `/payments`             | Add a payment                      |

| GET    | `/payments`             | Get stored payments                |

| POST   | `/recover/{payment\_id}` | Start recovery for a payment       |

| GET    | `/analytics`            | Get dashboard analytics            |



The APIs can be tested using the FastAPI Swagger interface.



\---



\## Current Project Status



The core PayRescue workflow has been implemented and tested.



Currently available:



\* Failed payment recording

\* SQLite database

\* Failure diagnosis

\* Recovery scoring

\* Priority assignment

\* Recovery action recommendation

\* Recovery simulation

\* Recovery verification

\* Learning result recording

\* Explainable AI decisions

\* Analytics

\* React dashboard

\* Backend and frontend integration

\* Git version control

\* GitHub repository



The current implementation demonstrates the complete payment recovery decision workflow using an explainable rule-based approach.



\---



\## Future Enhancements



There are several areas where PayRescue can be expanded.



\### Machine Learning



Train a model using historical payment recovery data to predict the probability of successful recovery.



\### Smarter Strategy Selection



Instead of selecting an action only from predefined rules, the system could rank multiple recovery strategies based on their expected success.



\### Customer Segmentation



Different customer groups could receive different recovery strategies based on their previous payment behavior.



\### Real Payment Gateway Integration



The simulation could eventually be connected to a real payment gateway environment.



\### Notifications



Recovery actions could be connected to email, SMS, or other notification services.



\### Advanced Analytics



The dashboard could include charts for:



\* Failure reason distribution

\* Priority distribution

\* Recovery success rate

\* Recovery amount

\* Payment trends



\### Real-Time Monitoring



The system could monitor payment failures as they happen and immediately identify important recovery opportunities.



\---



\## Why PayRescue?



PayRescue focuses on a simple but important idea:



\*\*A failed payment should not always be treated as a lost payment.\*\*



By understanding why a payment failed and deciding what should happen next, businesses can focus their recovery efforts where they are most useful.



The current rule-based system provides an explainable foundation, while the architecture can be extended later with machine learning and real payment data.



\---



\## Buildathon



PayRescue is being developed for the \*\*Razorpay AI Buildathon 2026\*\*.



The project explores how AI-driven decision support and explainability can be used to improve payment recovery.



The current version demonstrates the complete recovery workflow, while future versions can build on the existing system with machine learning, real-world payment data, and more advanced recovery optimization.



\---



\## Author



\*\*Vaishnavi Sunkara\*\*



\*\*PayRescue — AI-Powered Payment Recovery and Decision-Support System\*\*



