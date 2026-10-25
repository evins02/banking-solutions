/**
 * Zentrale Registrierung der (simulierten) Dienste. Für eine echte Anbindung
 * hier die Demo-Implementierungen durch produktive ersetzen.
 */
import { demoDokumentenleser, type DokumentenleserService } from './dokumentenleser';
import { demoHandelsregister, type HandelsregisterService } from './handelsregister';
import { demoTransparenzregister, type TransparenzregisterService } from './transparenzregister';

export interface Services {
  handelsregister: HandelsregisterService;
  transparenzregister: TransparenzregisterService;
  dokumentenleser: DokumentenleserService;
}

export const services: Services = {
  handelsregister: demoHandelsregister,
  transparenzregister: demoTransparenzregister,
  dokumentenleser: demoDokumentenleser,
};
