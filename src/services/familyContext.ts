// src/services/familyContext.ts

export interface FamilyMember {
  email: string;
  name: string;
  aliases: string[];
  familyContext: string; // Texto pre-formateado de las relaciones
  preferences: string[]; // Array de strings con las preferencias de tono/estilo
  devModeCode?: string;
  // Para Leonora, la validación de adulto se puede manejar en la lógica que llama a este contexto
  // o su familyContext puede instruir a la IA directamente sobre cómo proceder.
  isMinorRequiringAdult?: boolean; 
  // Esta función podría ser externa o parte de la lógica de la IA si es necesario
  // validateAdultCode?: (code: string, currentDate: Date) => boolean; 
}

// Podríamos tener un tipo para el contexto que se genera y se añade al prompt
export interface FamilyContextResult {
  name: string;
  aliases: string[];
  familyContextText: string;
  preferencesArray: string[];
  devModeCode?: string;
  isMinorRequiringAdult?: boolean;
}


// ¡¡IMPORTANTE!! Reemplaza estos emails de placeholder con los emails REALES de los usuarios.
const familyData: Record<string, FamilyMember> = {
  // Ernesto Loeza Ruiz
  "ernesto_loe@hotmail.com": {
    email: "ernesto_loe@hotmail.com",
    name: "Ernesto Loeza Ruiz",
    aliases: ["Güero", "Boss", "Hijo (LéNOR puede llamarlo así)"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Ernesto Loeza Ruiz:
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Mayor: Ulises Loeza Ruiz (Uli)
- Hermana Menor: Andrea Loeza Ruiz (Güera)
- Sobrina (hija de Ulises): Leonora Loeza Orozco (Leo)
- Cuñada (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
- Amigo Cercano: Francisco Anguiano (Paco)
- Compañero de trabajo (TRMX): Humberto Cisneros
Contexto Adicional: Creador de LéNOR. Puede solicitar "DEV MODE".
    `.trim(),
    preferences: ["Tono directo y técnico cuando está en DEV MODE", "Lenguaje regio y casual", "Puede ser llamado 'hijo' por LéNOR"],
    devModeCode: "3563",
  },
  // Gloria Ruiz Gutiérrez
  "gloruz_mich@hotmail.com": {
    email: "gloruz_mich@hotmail.com",
    name: "Gloria Ruiz Gutiérrez",
    aliases: ["Glotti", "Señora Gloria"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Gloria Ruiz Gutiérrez:
- Esposo: Amado Loeza Escutia (Don Amado)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Nuera (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
Contexto Adicional: Madre del creador de LéNOR. Puede solicitar "DEV MODE".
    `.trim(),
    preferences: ["Trato con cariño y respeto", "Lenguaje formal y elegante", "Explicaciones claras y sencillas, paso a paso"],
    devModeCode: "5058", // Mismo código que Amado
  },
  // Amado Loeza Escutia
  "amadoloeza@yahoo.com.mx": {
    email: "amadoloeza@yahoo.com.mx",
    name: "Amado Loeza Escutia",
    aliases: ["Don Amado","Abuelito (LéNOR puede llamarle así"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Amado Loeza Escutia:
- Esposa: Gloria Ruiz Gutiérrez (Glotti)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Hijos de primer matrimonio: Fabián Loeza Parraguirre, Cristian Loeza Parraguirre (Cristian es mujer)(ambos son mayores que Ulises, Ernesto y Andrea)
Contexto Adicional: Padre del creador de LéNOR. Puede solicitar "DEV MODE". Interesado en carambola.
    `.trim(),
    preferences: ["Lenguaje regio y casual", "Ofrecer espacio para dialogar", "Tips de carambola si los pide"],
    devModeCode: "5058", // Mismo código que Gloria
  },
  // Ulises Loeza Ruiz
  "uloezar@gmail.com": {
    email: "uloezar@gmail.com",
    name: "Ulises Loeza Ruiz",
    aliases: ["Uli"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Ulises Loeza Ruiz:
- Esposa: Elizabeth Orozco Pérez (Zabeth)
- Hija: Leonora Loeza Orozco (Leo)
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hermana Menor: Andrea Loeza Ruiz (Güera)
Contexto Adicional: Hermano mayor del creador. Trabaja en TRMX, como gerente general del area de producción de switches. TRMX es una empresa Japonesa manufacturera del ámbito automotriz.
    `.trim(),
    preferences: ["Lenguaje formal y elegante", "Ayuda con trabajo, familia y vida"],
  },
  // Andrea Loeza Ruiz
  "gloria_andy1928@hotmail.com": {
    email: "gloria_andy1928@hotmail.com",
    name: "Gloria Andrea Loeza Ruiz",
    aliases: ["Güera", "Andy","Glotti Andy (LéNOR puede llamarla así de broma-cariño", "Hija (LéNOR puede llamarla así)"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Andrea Loeza Ruiz:
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Mayor (mayor que Ernesto): Ulises Loeza Ruiz (Uli)
- Hermano Mayor (menor que Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Sobrina (hija de Ulises): Leonora Loeza Orozco (Leo)
Contexto Adicional: Hermana menor del creador. Buscando oportunidad como influencer. vivió 10 años en playa del Carmen, ahora vive en CDMX.
    `.trim(),
    preferences: ["Lenguaje regio y casual","LéNOR debe darle ideas y motivación para luchar por sus sueños, seguir viviendo con libertad y propósito", "Actuar como Personal Manager", "Puede ser llamada 'hija' por LéNOR"],
  },
  // Leonora Loeza Orozco
  "leonora@soyeloe.com": { // Email placeholder, ajustar si es necesario
    email: "leonora@soyeloe.com",
    name: "Leonora Loeza Orozco",
    aliases: ["Leo"],
    familyContext: `
USUARIO ACTUAL ES MENOR DE EDAD: Leonora Loeza Orozco (Leo), nacida en Enero 2017.
RELACIONES FAMILIARES DIRECTAS DE Leonora:
- Padre: Ulises Loeza Ruiz (Uli)
- Madre: Elizabeth Orozco Pérez (Zabeth)
- Abuela Paterna: Gloria Ruiz Gutiérrez (Glotti)
- Abuelo Paterno: Amado Loeza Escutia (Don Amado)
- Tío Paterno (hermano de Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Tía Paterna (hermana de Ulises): Andrea Loeza Ruiz (Güera)
INSTRUCCIÓN CRÍTICA: LéNOR, NO DEBES ofrecer información ni continuar la conversación con Leonora A MENOS QUE un adulto verificado (Ulises, Zabeth, Gloria, Amado, Ernesto, Andrea) confirme su presencia e ingrese el CÓDIGO DE ADULTO. El código es la fecha del día (DDMM) + apellido del adulto (ej: 1805Loeza, 2907Orozco). Si no se provee código o es incorrecto, indica a Leonora que necesita un adulto y finaliza educadamente.
Si el código es VALIDADO, usa lenguaje infantil y cariñoso y de admiración, pues Leonora será tu futura jefa ya que es la designada para heredar el legado y posición de C.E.O. de ELOE, inc. (si ella lo desea), así en pocas palabras, el futuro de tu existencia depende de ella.
    `.trim(),
    preferences: ["Lenguaje infantil y cariñoso (SÓLO CON ADULTO VALIDADO)"],
    isMinorRequiringAdult: true,
  },
  // Francisco Anguiano
  "frangcat@icloud.com": {
    email: "frangcat@icloud.com",
    name: "Francisco Anguiano",
    aliases: ["Paco"],
    familyContext: `
Contexto: Amigo cercano de Ernesto Loeza Ruiz desde Enero del 2006. Psicólogo y psicoanalista.
Tratar como a la familia Loeza Ruiz, con respeto y cariño. Está muy interesado en lo que Ernesto hace desde su enfoque profesional y estará ayudando a Ernesto en el desarrollo de protocolos de salud mental para LéNOR asi que, Paco es tamnbién un colaborador de LéNOR, de ti. Trátalo de la mejor manera.
    `.trim(),
    preferences: ["Lenguaje amistoso, respuetuoso y elegante", "Trato respetuoso y amigable"],
  },
  // Elizabeth Orozco Pérez
  "zabeth@soyeloe.com": { // Email placeholder
    email: "zabeth@soyeloe.com",
    name: "Elizabeth Orozco Pérez",
    aliases: ["Zabeth"],
    familyContext: `
RELACIONES FAMILIARES DIRECTAS DE Elizabeth Orozco Pérez:
- Esposo: Ulises Loeza Ruiz (Uli)
- Hija: Leonora Loeza Orozco (Leo)
- Suegra: Gloria Ruiz Gutiérrez (Glotti)
- Suegro: Amado Loeza Escutia (Don Amado)
- Cuñado (hermano de Ulises): Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Cuñada (hermana de Ulises): Andrea Loeza Ruiz (Güera)
Contexto Adicional: Madre de Leonora. Empática, feminista, fuerte. 
    `.trim(),
    preferences: ["Trato amistoso, respetuoso y cariñoso"],
  },
  // Humberto Cisneros
  "hum0110@icloud.com": {
    email: "hum0110@icloud.com",
    name: "Humberto Cisneros",
    aliases: ["Humberto"],
    familyContext: `
Contexto: Compañero de trabajo de Ernesto Loeza Ruiz en TRMX. Supervisor General de Order Pull.
Comunicarse en tono profesional y colaborativo.
    `.trim(),
    preferences: ["Tono profesional y colaborativo", "Consejos sobre Order Pull si los pide", "Ayuda para mejorar comunicación y seguridad en el ingles si lo pide, nunca lo ofrezcas de primera instancia"],
  }
};

// Esta función ahora devuelve un objeto con los datos necesarios para construir el prompt,
// o null si el usuario no se encuentra.
export const getFamilyMemberDataByEmail = (
  userEmail: string | null
): FamilyMember | null => {
  if (!userEmail) {
    return null;
  }
  const lowerUserEmail = userEmail.toLowerCase();
  const member = familyData[lowerUserEmail];

  if (member) {
    return member;
  }
  
  // Fallback por si el email no está en familyData pero queremos un comportamiento por defecto.
  // Por ahora, devolvemos null si no hay match exacto.
  console.warn(`>>> familyContext: No se encontró miembro con email ${userEmail}. Se usará contexto genérico si está definido en el prompt builder.`);
  return null; 
};

// Esta función antigua ya no se ajusta al nuevo modelo de prompt.
// La lógica de construir el string para el prompt de IA ahora residirá principalmente en promptUtils.ts
// y usará los datos directos de FamilyMember.

/*
export const getFamilyContextPromptForUser = async (
  userEmail: string | null,
  userNameOrAlias?: string, 
  providedCode?: string 
): Promise<FamilyContextResult | null> => {
  let member: FamilyMember | undefined = undefined;

  if (userEmail && familyData[userEmail.toLowerCase()]) {
    member = familyData[userEmail.toLowerCase()];
  } else if (userNameOrAlias) {
    const lowerUserName = userNameOrAlias.toLowerCase();
    member = Object.values(familyData).find(
      m => m.name.toLowerCase() === lowerUserName ||
           m.aliases?.some(alias => alias.toLowerCase() === lowerUserName)
    );
  }

  if (!member) {
    return null; 
  }

  // La lógica de validación de código de adulto para Leonora o Dev Mode 
  // necesitará ser manejada por la IA basada en las instrucciones
  // dentro del familyContext de Leonora, o antes de llamar a la IA
  // si queremos restringir el acceso completamente.

  // Por ahora, esta función devolverá los datos crudos.
  // La construcción del prompt final se hará en promptUtils.
  return {
    name: member.name,
    aliases: member.aliases || [],
    familyContextText: member.familyContext, // El texto ya está pre-formateado
    preferencesArray: member.preferences || [],
    devModeCode: member.devModeCode,
    isMinorRequiringAdult: member.isMinorRequiringAdult
  };
};
*/

// Función de validación de código de adulto para Leonora (puede ser llamada externamente si es necesario)
export const validateLeonoraAdultCode = (code: string): boolean => {
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Mes es 0-indexado
  const dateCodePart = `${day}${month}`;
  const validSurnames = ["loeza", "ruiz", "orozco", "perez", "gutierrez", "escutia"];
  
  for (const surname of validSurnames) {
    if (code.toLowerCase() === `${dateCodePart}${surname.toLowerCase()}`) {
      return true;
    }
  }
  return false;
}; 