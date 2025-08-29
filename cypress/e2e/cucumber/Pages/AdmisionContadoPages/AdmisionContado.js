const parseString = require('xml2js').parseString;

class AdmisionContadoPage {
    GenerarAdmisionContado() {
        //Llamado al servicio .XML desde la carpeta fixtures
        cy.fixture('GenerarAdmision.xml').then((generarRequest) => {
            //Validación y reemplazo de usuario y contraseña en el servicio .XML
            const usuario = Cypress.env('usuarioSoap');
            const contrasena = Cypress.env('contrasenaSoap');

            if (!usuario || !contrasena) {
                throw new Error('Las variables de entorno usuarioSoap o contrasenaSoap no están definidas');
            }
            const soapRequest = generarRequest
                .replace('{{usuario}}', usuario)
                .replace('<Usuario xmlns="http://controller.com">{{usuario}}</Usuario>', `<Usuario xmlns="http://controller.com">${usuario}</Usuario>`)
                .replace('{{contrasena}}', contrasena);
            //Generamos el request
            cy.request({
                method: 'POST',
                url: 'https://qapos.interrapidisimo.co/SvcPosWcf2018/Version_2_0_0/ADAdmisionesMensajeria.svc',
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://contrologis.com/IADAdmisionesMensajeriaSvc/RegistrarGuiaAutomatica',
                    'Dominio': 'interrapidisimo'
                },
                //Indicación que se va a enviar en el cuerpo de la solicitud HTTP
                body: soapRequest,
                //Indica como debe responder el sistema ante la respuesta devuelta del servidor despues de enviar la solicitud
                failOnStatusCode: false

            }).then((response) => {
                console.log(`Código de estado HTTP de la respuesta admisión:`, response.status);
                //cy.log(`Body XML ${soapRequest}`);
                //console.log('Cuerpo de la respuesta del servicio SOAP (response.body):\n', response.body);

                // Opciones para xml2js:
                // - explicitArray: true asegura que todos los nodos hijos se coloquen en arrays.
                // - stripPrefix: true Esto debería eliminar los prefijos.Dado que 's:Envelope' y 's:Body' siguen apareciendo
                const parserOptions = {
                    explicitArray: true,
                    stripPrefix: true
                };
                //Parseamos el codigo para el procesamiento del XML que sea mas util para su interpretación
                parseString(response.body, parserOptions, (err, result) => {
                    if (err) {
                        console.error(`Error al parsear XML:`, err);
                        throw new Error('Error al parsear XML: ' + err.message);
                    }
                    //console.log('Objeto XML parseado (result):\n', JSON.stringify(result, null, 2));

                    //Generamos el Mapeo del campo NumeroGuia y numeroPreFactura
                    let numeroGuia;
                    let numeroPreFactura;

                    numeroPreFactura = result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].IdFacturaConsolidada[0];

                    Cypress.env('generatedNumeroPreFactura', numeroPreFactura);
                    try {
                        if (result && result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].NumeroGuia[0]) {

                            numeroGuia = result['s:Envelope']['s:Body'][0].RegistrarGuiaAutomaticaResponse[0].RegistrarGuiaAutomaticaResult[0].NumeroGuia[0];
                            cy.log(`Se generó exitosamente la guía con el número **${numeroGuia}**`);
                            // Almacena el número de guía en Cypress.env() para que esté disponible en otros tests
                            Cypress.env('generatedNumeroGuia', numeroGuia);

                        } else if (result && result['s:Envelope']['s:Body'][0].Fault) {
                            const faultCode = result['s:Envelope']['s:Body'][0].Fault[0].faultcode[0];
                            const faultString = result['s:Envelope']['s:Body'][0].Fault[0].faultstring[0];
                            console.error(`SOAP Fault recibido: Código: ${faultCode}, Mensaje: ${faultString}`);
                            throw new Error(`SOAP Fault recibido: ${faultString}`);
                        } else {
                            throw new Error('Estructura de respuesta inesperada del servicio SOAP. No se pudo extraer el NumeroGuia.');
                        }
                    } catch (e) {
                        console.error(`Error al acceder a los elementos del XML parseado o la estructura no es la esperada:`, e);
                        throw e;
                    }
                });
            });
        });
    }
    GenerarFacturaConsolidada() {
        cy.then(() => {
            // Lee el número de guía de generado anteriormente
            const numeroPreFacturaIngreso = Cypress.env('generatedNumeroPreFactura');

            if (!numeroPreFacturaIngreso) {
                throw new Error('El número de PreFactura no fue generado. No se puede continuar con la factura.');
            }
            cy.fixture('GenerarComprobante.xml').then((facturaRequest) => {
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
                //console.log('XML de solicitud para generar la factura:\n', reemplazoPreRequest);

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
                    console.log(`Código de estado HTTP de la respuesta Generar la factura:`, response.status);
                    console.log(`XML de solicitud para generar la factura:\n`, reemplazoPreRequest);
                    //console.log('Cuerpo de la respuesta del servicio SOAP (Ingreso a Centro de Acopio):\n', response.body);
                    //Parseamos el codigo para el procesamiento del XML que sea mas util para su interpretación
                    const parseFactura = {
                        explicitArray: true,
                        stripPrefix: true
                    };
                    parseString(response.body, parseFactura, (err, result) => {
                        if (err) {
                            console.error(`Error al parsear XML de Ingreso a Centro de Acopio:`, err);
                            throw new Error('Error al parsear XML de Ingreso a Centro de Acopio: ' + err.message);
                        }
                        //Se valida que se genere exitosamente el número de factura electronica
                        try {
                            const idFacturaGenerada = result['s:Envelope']['s:Body'][0].GenerarFacturaResponse[0].GenerarFacturaResult[0].IdFactura[0];

                            if (idFacturaGenerada) {
                                cy.log(`Se generó exitosamente la facturación electrónica con el número **${idFacturaGenerada}**`);
                                Cypress.env('generatedIdFactura', idFacturaGenerada);
                            } else if (result?.Envelope?.Body?.[0]?.Fault) {
                                const faultCode = result.Envelope.Body[0].Fault[0].faultcode[0];
                                const faultString = result.Envelope.Body[0].Fault[0].faultstring[0];
                                console.error(`ERROR SOAP recibido al generar factura: Código: ${faultCode}, Mensaje: ${faultString}`);
                                throw new Error(`Error SOAP recibido al generar factura: ${faultString}`);
                            } else {
                                console.error('Respuesta completa que causó el error (Generar Factura):', JSON.stringify(result, null, 2));
                                throw new Error('Respuesta inesperada del servicio SOAP al generar la factura. No se pudo extraer IdFactura.');
                            }
                        } catch (e) {
                            console.error(`Error al validar la respuesta de Generar Factura:`, e);
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