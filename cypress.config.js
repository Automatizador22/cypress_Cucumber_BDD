import { defineConfig } from "cypress";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import fs from 'fs';

async function setupNodeEvents(on, config) {
  // Use a dynamic import to safely load the preprocessor.
  const preprocessor = await import('@badeball/cypress-cucumber-preprocessor/webpack');

  await addCucumberPreprocessorPlugin(on, config);

  // Use a fallback to correctly access the preprocessor function.
  // This solves the problem of the preprocessor not being a function.
  const cucumberPreprocessor = preprocessor.default || preprocessor;
  on('file:preprocessor', cucumberPreprocessor(config));

  // Tasks
  on('task', {
    deleteFile(filePath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Archivo ${filePath} eliminado exitosamente.`);
          return true;
        } else {
          console.log(`Archivo ${filePath} no existe, no se pudo eliminar.`);
          return false;
        }
      } catch (err) {
        console.error(`Error al eliminar el archivo ${filePath}:`, err);
        return false;
      }
    },
    manageJsonFile({ filePath, dataToAdd }) {
      console.log(`Iniciando con filePath: ${filePath}, dataToAdd:`, dataToAdd);
      let allRecords = [];
      try {
        if (!filePath || typeof filePath !== 'string') {
          console.error(`Error: filePath no es válido: ${filePath}`);
          throw new Error('Ruta de archivo no válida proporcionada a manageJsonFile.');
        }
        if (fs.existsSync(filePath)) {
          console.log(`Archivo ${filePath} existe. Leyendo contenido.`);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          if (fileContent) {
            try {
              allRecords = JSON.parse(fileContent);
              if (!Array.isArray(allRecords)) {
                console.warn(`Advertencia: El archivo ${filePath} no contiene un arreglo JSON válido. Se inicializará como nuevo.`);
                allRecords = [];
              } else {
                console.log(`Contenido existente parseado. Total de registros: ${allRecords.length}`);
              }
            } catch (parseError) {
              console.warn(`Advertencia: Error al analizar JSON de ${filePath}: ${parseError.message}. Se inicializará el archivo.`);
              allRecords = [];
            }
          } else {
            console.log(`Archivo ${filePath} existe pero está vacío.`);
          }
        } else {
          console.log(`Archivo ${filePath} no existe. Creando nuevo archivo con el primer registro.`);
        }
        console.log(`Agregando nuevos datos:`, dataToAdd);
        allRecords.push(dataToAdd);
        fs.writeFileSync(filePath, JSON.stringify(allRecords, null, 2), 'utf8');
        console.log(`Datos guardados exitosamente en ${filePath}.`);
        return null;
      } catch (err) {
        console.error(`Error fatal en manageJsonFile para ${filePath}:`, err);
        throw new Error(`Error en manageJsonFile: ${err.message}`);
      }
    },
  });

  // Environment variables
  config.env.guiasJsonPath = 'cypress/downloads/guias.json';
  config.env.usuarioSoap = "joansdurangos";
  config.env.contrasenaSoap = "J1012455822*";
  config.env.TOKEN_URL = 'https://ota2sfziul.execute-api.us-east-1.amazonaws.com/QA/autorizador';
  config.env.CREARSOLICITUD_URL = 'https://mediospagoqa.interrapidisimo.co/api/PagoPayZen/PostCrearSolicitudPago';
  config.env.TOKEN_USERNAME = 'user-cognitooauth2';
  config.env.TOKEN_PASSWORD = 'SW50ZXIyMDIxKg==';

  return config;
}

export default defineConfig({
  e2e: {
    specPattern: "cypress/e2e/**/*.feature",
    setupNodeEvents,
  },
});