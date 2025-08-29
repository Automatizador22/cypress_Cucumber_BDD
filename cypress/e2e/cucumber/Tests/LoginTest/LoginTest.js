import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import login from "../../Pages/LoginPage/LoginPage.cy.js";

Given("I navigate to the Website", () => {
  login.enterURL();
});

When("I entered valid credential", (datatable) => {
  datatable.hashes().forEach((element) => {
    login.enterUserNamePassword(element.email, element.validpassword);
    login.clickSubmitButton();
  });
});

Then("Validate the title after login", () => {
  login.verifyPageTitle();
});