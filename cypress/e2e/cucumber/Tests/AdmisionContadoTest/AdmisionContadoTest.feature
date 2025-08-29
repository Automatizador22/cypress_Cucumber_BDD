Feature: Quiero generar una admision contado exitosa

Scenario: Generar Admision contado y factura
  Given Genero la venta contado
  When Genero el comprobante
  Then Valido que se genere la guía, la prefactura y la factura