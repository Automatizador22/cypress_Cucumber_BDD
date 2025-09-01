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
}

const AdmisionContado = new AdmisionContadoPage();
export default AdmisionContado;