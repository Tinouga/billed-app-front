/**
 * @jest-environment jsdom
 */

import {fireEvent, screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import {bills} from "../fixtures/bills.js"
import {ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

import Bills from "../containers/Bills.js";
import router from "../app/Router.js";
import {formatDate} from "../app/format.js";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
    describe("When I am on Bills Page", () => {
        beforeEach(() => {
            Object.defineProperty(window, 'localStorage', {value: localStorageMock});
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee'
            }));
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.append(root);
            router();
            window.onNavigate(ROUTES_PATH.Bills);
        });
        test("Then bill icon in vertical layout should be highlighted", async () => {
            await waitFor(() => screen.getByTestId('icon-window'))
            const windowIcon = screen.getByTestId('icon-window')
            const isActive = windowIcon.classList.contains('active-icon');
            expect(isActive).toBeTruthy();
        })
        test("Then bills should be ordered from earliest to latest", async () => {
            const billsContainer = new Bills({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage
            });

            const antiChrono = (a, b) => ((a < b) ? 1 : -1);

            const expectedOrder = bills.sort((a, b) => antiChrono(a.date, b.date)).map(bill => formatDate(bill.date));
            const currentOrder = await billsContainer.getBills().then(bills => bills.map(bill => bill.date));

            expect(currentOrder).toEqual(expectedOrder);

            // the test below fits a suboptimal implementation, still leaving it here for reference
            // document.body.innerHTML = BillsUI({ data: bills })
            // const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
            // const antiChrono = (a, b) => ((a < b) ? 1 : -1)
            // const datesSorted = [...dates].sort(antiChrono)
            // expect(dates).toEqual(datesSorted)
        })
        describe("When I click on the eye icon", () => {
            test("A modal should open", () => {
                document.body.innerHTML = BillsUI({data: bills});
                const onNavigate = (pathname) => {
                    document.body.innerHTML = ROUTES({pathname})
                };
                const billsContainer = new Bills({
                    document,
                    onNavigate,
                    localStorage: window.localStorage
                });

                const modal = screen.getByTestId('modaleFile');
                // mock the opening of the modal
                $.fn.modal = jest.fn(() => modal.classList.add('show'));
                const iconEye = screen.getAllByTestId('icon-eye')[0]
                const handleClickIconEye = jest.fn(() => billsContainer.handleClickIconEye(iconEye));
                iconEye.addEventListener('click', handleClickIconEye);
                fireEvent.click(iconEye);
                expect(handleClickIconEye).toBeCalled();
                const isModalShown = modal.classList.contains('show');
                expect(isModalShown).toBeTruthy();
            });
        });
        describe("When I click on the Nouvelle note de frais button", () => {
            test("Then it should redirect me to the NewBill page", async () => {
                document.body.innerHTML = BillsUI({data: bills});
                const onNavigate = (pathname) => {
                    document.body.innerHTML = ROUTES({pathname})
                };
                const billsContainer = new Bills({
                    document,
                    onNavigate,
                    localStorage: window.localStorage
                });

                const newBillFn = jest.fn(billsContainer.handleClickNewBill);
                const newBillBtn = screen.getByTestId('btn-new-bill');
                newBillBtn.addEventListener('click', newBillFn);
                fireEvent.click(newBillBtn);
                expect(newBillFn).toBeCalled();
                expect(screen.getAllByText('Envoyer une note de frais')).toBeTruthy();
            });
        });
    })
})

// test d'intégration GET
describe("Given I am a user connected as an employee", () => {
    describe("When I navigate to Bills", () => {
        test("fetches bills from mock API GET", async () => {
            localStorage.setItem("user", JSON.stringify({type: "Employee", email: "a@a"}));
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.append(root);
            router();
            window.onNavigate(ROUTES_PATH.Bills);

            await waitFor(() => screen.getByText("Mes notes de frais"));

            const bill = screen.getByText("test3");
            expect(bill).toBeTruthy();
        });
    });
    describe("When an error occurs on API", () => {
        let spy;
        beforeEach(() => {
            spy = jest.spyOn(mockStore, "bills");
            Object.defineProperty(
                window,
                'localStorage',
                {value: localStorageMock}
            );
            window.localStorage.setItem('user', JSON.stringify({
                type: 'Employee',
                email: "a@a"
            }));
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.appendChild(root);
            router();
        });
        afterEach(() => {
            spy.mockRestore();
        });
        test("fetches bills from an API and fails with 404 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error("Erreur 404"))
                    }
                }
            });
            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = await screen.getByText(/Erreur 404/)
            expect(message).toBeTruthy()
        });
        test("fetches messages from an API and fails with 500 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error("Erreur 500"))
                    }
                }
            });
            window.onNavigate(ROUTES_PATH.Dashboard);
            await new Promise(process.nextTick);
            const message = await screen.getByText(/Erreur 500/);
            expect(message).toBeTruthy();
        });
    });
});
