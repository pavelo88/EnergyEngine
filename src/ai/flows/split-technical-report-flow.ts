'use server';
/**
 * @fileOverview A Genkit flow to split a dictated technical report into sections.
 *
 * - splitTechnicalReport - Splits dictation into 'antecedentes', 'intervencion', and 'resumen'.
 * - SplitTechnicalReportInput - The input type for the splitTechnicalReport function.
 * - SplitTechnicalReportOutput - The return type for the splitTechnicalReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SplitTechnicalReportInputSchema = z.object({
  dictation: z
    .string()
    .describe('The full dictated technical report from the inspector.'),
});
export type SplitTechnicalReportInput = z.infer<
  typeof SplitTechnicalReportInputSchema
>;

const SplitTechnicalReportOutputSchema = z.object({
  antecedentes: z.string().describe("La sección de antecedentes del informe, describiendo el historial o el problema inicial. Debe estar en español."),
  intervencion: z.string().describe("La sección de intervención, detallando el trabajo realizado por el técnico. Debe estar en español."),
  resumen: z.string().describe("La sección de resumen y situación actual, explicando el estado final del equipo y las conclusiones. Debe estar en español."),
});
export type SplitTechnicalReportOutput = z.infer<
  typeof SplitTechnicalReportOutputSchema
>;

export async function splitTechnicalReport(
  input: SplitTechnicalReportInput
): Promise<SplitTechnicalReportOutput> {
  return splitTechnicalReportFlow(input);
}

const splitTechnicalReportPrompt = ai.definePrompt({
  name: 'splitTechnicalReportPrompt',
  input: {schema: SplitTechnicalReportInputSchema},
  output: {schema: SplitTechnicalReportOutputSchema},
  system: `Eres un asistente experto en redacción de informes técnicos para una empresa de mantenimiento de grupos electrógenos. Tu tarea es tomar un dictado completo en español y estructurarlo inteligentemente en tres secciones distintas: "antecedentes", "intervención" y "resumen y situación actual".

- "antecedentes": Describe el problema inicial, el historial de fallos o la razón de la visita.
- "intervencion": Detalla los pasos, las pruebas y las acciones que el técnico realizó.
- "resumen": Explica el estado final del equipo, las conclusiones, y si el problema fue resuelto o si se necesitan acciones futuras.

Analiza el siguiente dictado y rellena las tres secciones. La salida debe ser siempre en español.`,
  prompt: `Dictado completo: """{{{dictation}}}"""`,
});

const splitTechnicalReportFlow = ai.defineFlow(
  {
    name: 'splitTechnicalReportFlow',
    inputSchema: SplitTechnicalReportInputSchema,
    outputSchema: SplitTechnicalReportOutputSchema,
  },
  async input => {
    const {output} = await splitTechnicalReportPrompt(input);
    return output!;
  }
);
