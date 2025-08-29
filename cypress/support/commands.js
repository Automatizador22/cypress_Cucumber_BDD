// Se utiliza para limpiar el archivo JSON de resultados de ejecuciones anteriores
before(() => {
  const rutaGuias = Cypress.env('guiasJsonPath');
    cy.task('deleteFile', rutaGuias).then((deleted) => {
        if (deleted) {
            cy.log(`Archivo ${rutaGuias} eliminado exitosamente antes de las ejecuciones.`);
        } else {
            cy.log(`Archivo ${rutaGuias} no existía o no pudo ser eliminado. Continuando...`);
        }
    });
});