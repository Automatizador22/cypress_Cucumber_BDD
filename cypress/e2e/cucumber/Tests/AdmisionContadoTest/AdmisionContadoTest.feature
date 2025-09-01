Feature: Quiero generar una admision contado exitosa

Scenario: Generar Admision contado y factura
  Given Genero la venta contado
  When Genero el comprobante
  Then Valido que se genere la guía correctamente

Scenario: Venta contado con su factura y ingreso a Centro Acopio
  Given Genero la venta contado
  When Genero el comprobante
  When Ingreso a Centro de Acopio
  Then Valido que se genere la guía correctamente