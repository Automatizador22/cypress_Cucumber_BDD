class AdmisionContadoPage {
    GenerarAdmisionContado() {
        cy.fixture('SOAP/GenerarAdmision.xml').then((generarRequest) => {
            const usuario = Cypress.env('usuarioSoap');
            const contrasena = Cypress.env('contrasenaSoap');

            if (!usuario || !contrasena) {
                throw new Error('Las variables de entorno usuarioSoap o contrasenaSoap no están definidas');
            }

            const soapRequest = generarRequest
                .replace('{{usuario}}', usuario)
                .replace('<Usuario xmlns="http://controller.com">{{usuario}}</Usuario>', `<Usuario xmlns="http://controller.com">${usuario}</Usuario>`)
                .replace('{{contrasena}}', contrasena);

            cy.request({
                method: 'POST',
                url: 'https://qapos.interrapidisimo.co/SvcPosWcf2018/Version_2_0_0/ADAdmisionesMensajeria.svc',
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://contrologis.com/IADAdmisionesMensajeriaSvc/RegistrarGuiaAutomatica',
                    'Dominio': 'interrapidisimo'
                },
                body: soapRequest,
                failOnStatusCode: false
            }).then((response) => {
                cy.task("parseSoapResponse", { xml: response.body }).then((result) => {
                    let numeroGuia;
                    let numeroPreFactura;

                    try {
                        numeroPreFactura = result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].IdFacturaConsolidada[0];
                        Cypress.env('generatedNumeroPreFactura', numeroPreFactura);

                        if (result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].NumeroGuia[0]) {
                            numeroGuia = result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].NumeroGuia[0];
                            cy.log(`Se generó exitosamente la guía con el número **${numeroGuia}**`);
                            Cypress.env('generatedNumeroGuia', numeroGuia);
                        } else if (result['s:Envelope']['s:Body'][0].Fault) {
                            const faultCode = result['s:Envelope']['s:Body'][0].Fault[0].faultcode[0];
                            const faultString = result['s:Envelope']['s:Body'][0].Fault[0].faultstring[0];
                            throw new Error(`SOAP Fault recibido: ${faultString}`);
                        } else {
                            throw new Error('Estructura de respuesta inesperada del servicio SOAP. No se pudo extraer el NumeroGuia.');
                        }
                    } catch (e) {
                        console.error(`Error al procesar respuesta SOAP:`, e);
                        throw e;
                    }
                });
            });
        });
    }

    GenerarFacturaConsolidada() {
        cy.then(() => {
            const numeroPreFacturaIngreso = Cypress.env('generatedNumeroPreFactura');

            if (!numeroPreFacturaIngreso) {
                throw new Error('El número de PreFactura no fue generado. No se puede continuar con la factura.');
            }

            cy.fixture('SOAP/GenerarComprobante.xml').then((facturaRequest) => {
                const usuario = Cypress.env('usuarioSoap');
                const contrasena = Cypress.env('contrasenaSoap');

                if (!usuario || !contrasena) {
                    throw new Error('Las variables de entorno usuarioSoap o contrasenaSoap no están definidas');
                }

                const reemplazoPreRequest = facturaRequest
                    .replace('{{usuario}}', usuario)
                    .replace('<Usuario xmlns="http://controller.com">{{usuario}}</Usuario>', `<Usuario xmlns="http://controller.com">${usuario}</Usuario>`)
                    .replace('{{contrasena}}', contrasena)
                    .replace('PRE_FACTURA', numeroPreFacturaIngreso);

                cy.request({
                    method: 'POST',
                    url: 'https://qapos.interrapidisimo.co/SvcPosWcf2018/Version_2_0_0/FCFacturacionConsolidadaSvc.svc',
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': 'http://contrologis.com/IFCFacturacionConsolidadaSvc/GenerarFactura',
                        'Dominio': 'interrapidisimo'
                    },
                    body: reemplazoPreRequest,
                    failOnStatusCode: false
                }).then((response) => {
                    cy.task("parseSoapResponse", { xml: response.body }).then((result) => {
                        try {
                            const idFacturaGenerada = result['s:Envelope']['s:Body'][0].GenerarFacturaResponse[0].GenerarFacturaResult[0].IdFactura[0];

                            if (idFacturaGenerada) {
                                cy.log(`Se generó exitosamente la facturación electrónica con el número **${idFacturaGenerada}**`);
                                Cypress.env('generatedIdFactura', idFacturaGenerada);
                            } else if (result?.Envelope?.Body?.[0]?.Fault) {
                                const faultCode = result.Envelope.Body[0].Fault[0].faultcode[0];
                                const faultString = result.Envelope.Body[0].Fault[0].faultstring[0];
                                throw new Error(`Error SOAP recibido al generar factura: ${faultString}`);
                            } else {
                                throw new Error('Respuesta inesperada del servicio SOAP al generar la factura. No se pudo extraer IdFactura.');
                            }
                        } catch (e) {
                            console.error(`Error al procesar respuesta SOAP de Factura:`, e);
                            throw e;
                        }
                    });
                });
            });
        });
    }
    IngresarCentroAcopio() {
        cy.then(() => {
            // Leemos los datos generados anteriormente
            const numeroGuiaParaIngreso = Cypress.env('generatedNumeroGuia');
            const numeroPreFacturaIngreso = Cypress.env('generatedNumeroPreFactura');
            const idFacturaGenerada = Cypress.env('generatedIdFactura');

            if (!numeroGuiaParaIngreso) {
                throw new Error('El número de guía no fue generado. No se puede continuar con el ingreso.');
            }
            // Obtener la ruta del archivo JSON desde las variables de entorno de Cypress
            const rutaGuias = Cypress.env('guiasJsonPath');
            if (!rutaGuias) {
                throw new Error('La ruta del archivo donde estan almacenadas las guías no está definida');
            }
            //Datos que se van a guardar en el JSON
            const datosGuiasJson = {
                numeroGuia: numeroGuiaParaIngreso,
                numeroPreFactura: numeroPreFacturaIngreso,
                idFacturaGenerada: idFacturaGenerada,
                fechaGeneracion: new Date().toISOString()
            };

            // Lógica para leer, actualizar y escribir el JSON
            cy.task('manageJsonFile', { filePath: rutaGuias, dataToAdd: datosGuiasJson })
                .then(() => {
                    cy.log(`Archivo procesado y guardado exitosamente`);
                }, (err) => {
                    Cypress.log({
                        name: 'ERROR_TASK_JSON',
                        message: `La tarea para crear el archivo falló inesperadamente: ${err.message}`,
                        consoleProps: () => ({ error: err })
                    });
                    throw err;
                });
            cy.fixture('SOAP/IngresoCentroAcopio.xml').then((ingresoRequest) => {
                const usuario = Cypress.env('usuarioSoap');
                const contrasena = Cypress.env('contrasenaSoap');

                if (!usuario || !contrasena) {
                    throw new Error('Las variables de entorno usuarioSoap o contrasenaSoap no están definidas');
                }

                // Reemplaza el placeholder del número de guía en el XML
                const reemplazoRequest = ingresoRequest
                    .replace('{{usuario}}', usuario)
                    .replace('<Usuario xmlns="http://controller.com">{{usuario}}</Usuario>', `<Usuario xmlns="http://controller.com">${usuario}</Usuario>`)
                    .replace('{{contrasena}}', contrasena)
                    .replace('GUIA_GENERADA', numeroGuiaParaIngreso);
                //console.log('XML de solicitud para Ingreso a Centro de Acopio:\n', reemplazoRequest);

                cy.request({
                    method: 'POST',
                    url: 'https://qapos.interrapidisimo.co/SvcPosWcf2018/Version_2_0_0/OUOperacionUrbanaSvc.svc',
                    headers: {
                        'Content-Type': 'text/xml;charset=UTF-8',
                        'SOAPAction': 'http://contrologis.com/IOUOperacionUrbanaSvc/IngresarGuiaSueltaWPF',
                        'Dominio': 'interrapidisimo'
                    },
                    body: reemplazoRequest,
                    failOnStatusCode: false
                }).then((response) => {

                    cy.task("parseSoapResponse", { xml: response.body }).then((result) => {

                        try {
                            // Esperamos que en nuestra respuesta contenga el Result en EXITOSO
                            if (result && result['s:Envelope']['s:Body'][0].IngresarGuiaSueltaWPFResponse[0].IngresarGuiaSueltaWPFResult[0] === 'EXITOSO') {

                                cy.log(`Guía **${numeroGuiaParaIngreso}** ingresada exitosamente al centro de acopio.`);
                                //Si ocurre algun error se esta controlando
                            } else if (result && result.Envelope.Body[0].Fault) {
                                const faultCode = result.Envelope.Body[0].Fault[0].faultcode[0];
                                const faultString = result.Envelope.Body[0].Fault[0].faultstring[0];
                                console.error(`Error recibido al intentar ingresar guía: Código: ${faultCode}, Mensaje: ${faultString}`);
                                throw new Error(`Error recibido al intentar ingresar guía: ${faultString}`);
                            } else {
                                // Si la respuesta no es 200, no es un Fault, y no tiene la estructura de éxito esperada
                                console.error('Respuesta completa que causó el error:', JSON.stringify(result, null, 2));
                                throw new Error('Respuesta inesperada al intentar ingresar la guía al centro de acopio.');
                            }
                        } catch (e) {
                            console.error(`Error al validar la respuesta de Ingreso a Centro de Acopio:`, e);
                            throw e;
                        }
                    });
                });
            });
        });
    }
}

const AdmisionContado = new AdmisionContadoPage();
export default AdmisionContado;