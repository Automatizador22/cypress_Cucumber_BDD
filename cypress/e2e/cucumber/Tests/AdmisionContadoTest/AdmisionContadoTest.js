import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import AdmisionContadoPage from "../../Pages/AdmisionContadoPages/AdmisionContado.js";

Given("Genero la venta contado", () => {
    AdmisionContadoPage.GenerarAdmisionContado();
});

When("Genero el comprobante", () => {
    AdmisionContadoPage.GenerarFacturaConsolidada();
});

Then("Validar que se genero la guía y el numero de comprobante", () => {
    const numeroGuia = Cypress.env('generatedNumeroGuia');
    const numeroPreFactura = Cypress.env('generatedNumeroPreFactura');
    const idFactura = Cypress.env('generatedIdFactura');

    cy.wrap(numeroGuia).should('exist').and('not.be.empty');
    cy.log(`Guía generada: ${numeroGuia}`);
    cy.wrap(numeroPreFactura).should('exist').and('not.be.empty');
    cy.log(`PreFactura generada: ${numeroPreFactura}`);
    cy.wrap(idFactura).should('exist').and('not.be.empty');
    cy.log(`Factura generada: ${idFactura}`);
});