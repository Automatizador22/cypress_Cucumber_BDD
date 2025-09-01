import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import AdmisionContadoPage from "../../Pages/AdmisionContadoPages/AdmisionContado.js";

Given("Genero la venta contado", () => {
    AdmisionContadoPage.GenerarAdmisionContado();
});

When("Genero el comprobante", () => {
    AdmisionContadoPage.GenerarFacturaConsolidada();
});

When("Ingreso a Centro de Acopio", () => {
    AdmisionContadoPage.IngresarCentroAcopio();
});

Then("Valido que se genere la guía correctamente", () => {
    const numeroGuia = Cypress.env('generatedNumeroGuia');
    const numeroPreFactura = Cypress.env('generatedNumeroPreFactura');
    const idFactura = Cypress.env('generatedIdFactura');

    cy.wrap(numeroGuia).should('exist');
    cy.wrap(numeroPreFactura).should('exist');
    cy.wrap(idFactura).should('exist');
});