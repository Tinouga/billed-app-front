/**
 * @jest-environment jsdom
 */

import {fireEvent, screen, waitFor} from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import {localStorageMock} from "../__mocks__/localStorage.js";
import {ROUTES, ROUTES_PATH} from "../constants/routes.js";
import router from "../app/Router.js";
import mockStore from "../__mocks__/store.js";


describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the main icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }));
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail');
      const isActive = mailIcon.classList.contains('active-icon');
      expect(isActive).toBeTruthy();
    });
    test("Then the form should be rendered", () => {
      document.body.innerHTML = NewBillUI();
      const form = screen.getByTestId('form-new-bill');
      expect(form).toBeTruthy();
    });
    describe("When I click on the submit button", () => {
      test("If the form required fields are empty, it should not be submitted", () => {
        const user = { type: 'Employee' };
        Storage.prototype.getItem = jest.fn((key) => {
          if(key === 'user') return JSON.stringify(user);
          return null;
        });

        document.body.innerHTML = NewBillUI();
        const onNavigate = jest.fn();
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        });

        const expenseInput = screen.getByTestId('expense-type');
        const datePickerInput = screen.getByTestId('datepicker');
        const amountInput = screen.getByTestId('amount');
        const pctInput = screen.getByTestId('pct');
        const fileInput = screen.getByTestId('file');

        // ensuring required fields are empty
        expenseInput.value = '';
        datePickerInput.value = '';
        amountInput.value = '';
        pctInput.value = '';
        fileInput.value = '';

        const handleSubmitSpy = jest.spyOn(newBill, 'handleSubmit');

        const form = screen.getByTestId('form-new-bill');
        // mocking the html 5 form validation
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if(!event.target.checkValidity()) {
              event.stopPropagation();
            } else {
              newBill.handleSubmit(event);
            }
        });

        fireEvent.submit(form);

        expect(handleSubmitSpy).not.toHaveBeenCalled();
        handleSubmitSpy.mockRestore();
      });
    });
    describe("When I upload file", () => {
      let newBill;
      let handleChangeFileSpy;
      let createBillSpy;
      let fileInput;
      let fileErrorSpan;

      beforeEach(() => {
        const user = { type: 'Employee' };
        Storage.prototype.getItem = jest.fn((key) => {
          if(key === 'user') return JSON.stringify(user);
          return null;
        });

        document.body.innerHTML = NewBillUI();
        const onNavigate = jest.fn();
        newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage
        });

        handleChangeFileSpy = jest.spyOn(newBill, "handleChangeFile");
        createBillSpy = jest.spyOn(mockStore.bills(), 'create');

        fileInput = screen.getByTestId('file');
        fileErrorSpan = screen.getByTestId('file-error');

        fileInput.addEventListener('change', newBill.handleChangeFile);
      });
      afterEach(() => {
        handleChangeFileSpy.mockRestore();
        createBillSpy.mockRestore();
      });

      describe("And the file is not an image", () => {
        test("Then an error message should be displayed", () => {
          const mockedFile = new File(['file'], 'file.pdf', { type: 'application/pdf' });
          Object.defineProperty(fileInput, 'files', {
            value: [mockedFile],
            writable: false
          });

          fireEvent.change(fileInput);

          expect(handleChangeFileSpy).toHaveBeenCalled();
          expect(createBillSpy).not.toHaveBeenCalled();
          expect(fileErrorSpan.textContent).toBe("Seuls les fichiers jpg, jpeg et png sont autorisés.");
        });
      });
      describe("And the file is a valid image type", () => {
        test("Then the file should be uploaded", () => {
          const mockedFile = new File(['file'], 'file.jpg', {type: 'image/jpg'});
          Object.defineProperty(fileInput, 'files', {
            value: [mockedFile],
            writable: false
          });

          fireEvent.change(fileInput);

          expect(handleChangeFileSpy).toHaveBeenCalled();
          expect(createBillSpy).toHaveBeenCalled();
          expect(fileErrorSpan.textContent).toBe("");
        });
      });
    });
  })
});

// test d'intégration POST
describe("Given I am a user connected as an employee", () => {
  describe("When I submit a new bill with valid data", () => {
    test("Then a new bill should be created", async () =>{
      const user = { type: 'Employee' };
      Storage.prototype.getItem = jest.fn((key) => {
        if(key === 'user') return JSON.stringify(user);
        return null;
      });

      document.body.innerHTML = NewBillUI();
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({pathname})
      };
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      const createBillSpy = jest.spyOn(mockStore.bills(), 'create');
      const updateBillSpy = jest.spyOn(mockStore.bills(), 'update');

      const form = screen.getByTestId('form-new-bill');

      const expenseInput = screen.getByTestId('expense-type');
      const datePickerInput = screen.getByTestId('datepicker');
      const amountInput = screen.getByTestId('amount');
      const pctInput = screen.getByTestId('pct');
      const fileInput = screen.getByTestId('file');

      fileInput.addEventListener('change', newBill.handleChangeFile);
      form.addEventListener('submit', newBill.handleSubmit);

      const mockedFile = new File(['file'], 'file.jpg', { type: 'image/jpg' });

      // filling the required fields with valid data
      expenseInput.value = 'Transports';
      datePickerInput.value = '2021-09-01';
      amountInput.value = '100';
      pctInput.value = '20';
      Object.defineProperty(fileInput, 'files', {
        value: [mockedFile],
        writable: false
      });

      fireEvent.change(fileInput);
      fireEvent.submit(form);

      expect(createBillSpy).toHaveBeenCalled();
      expect(updateBillSpy).toHaveBeenCalled();
      expect(updateBillSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: JSON.stringify({
          type: "Transports",
          name: "",
          amount: 100,
          date: "2021-09-01",
          vat: "",
          pct: 20,
          commentary: "",
          fileUrl: null,
          fileName: null,
          status: "pending"
        }),
        selector: null
      }));

      // verifying that we're redirected to the bills page
      await waitFor(() => screen.getByText("Mes notes de frais"));
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();

      createBillSpy.mockRestore();
      updateBillSpy.mockRestore();
    });
  });
});
