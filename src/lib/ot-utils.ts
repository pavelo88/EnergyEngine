import { doc, getDoc, runTransaction, query, collection, where, getDocs, type Firestore } from 'firebase/firestore';

/**
 * Genera el siguiente ID de Orden de Trabajo (OT) con formato OT-YYYY-XXXX.
 * Utiliza una transacción en Firestore para asegurar la unicidad y consistencia.
 */
export async function getNextOTId(db: Firestore): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);
  const counterRef = doc(db, 'config', 'ot_counter');

  try {
    const nextSequence = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let sequences = { [yearStr]: 0 };
      if (counterDoc.exists()) {
        sequences = counterDoc.data().sequences || {};
      }

      const currentSeq = sequences[yearStr] || 0;
      const nextSeq = currentSeq + 1;

      // Actualizar el contador para el año actual
      transaction.set(counterRef, {
        sequences: {
          ...sequences,
          [yearStr]: nextSeq
        }
      }, { merge: true });

      return nextSeq;
    });

    // Formatear el ID: OT-2025-0001
    const formattedSeq = String(nextSequence).padStart(4, '0');
    return `OT-${yearStr}-${formattedSeq}`;
  } catch (error) {
    console.error("Error al generar ID de OT:", error);
    throw new Error("No se pudo generar el correlativo de la OT.");
  }
}

/**
 * Decrementa el contador de OT si el ID proporcionado es el último generado.
 */
export async function decrementOTCounterIfLast(db: Firestore, id: string): Promise<void> {
  const parts = id.split('-');
  if (parts.length !== 3) return;
  const yearStr = parts[1];
  const seq = parseInt(parts[2], 10);
  
  const counterRef = doc(db, 'config', 'ot_counter');
  
  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) return;
      
      const sequences = counterDoc.data().sequences || {};
      const currentSeq = sequences[yearStr] || 0;
      
      if (seq === currentSeq) {
        transaction.update(counterRef, {
          [`sequences.${yearStr}`]: Math.max(0, currentSeq - 1)
        });
      }
    });
  } catch (error) {
    console.error("Error al decrementar contador de OT:", error);
  }
}

/**
 * Genera el ID para un nuevo informe vinculado a una OT.
 * Ejemplo: OT-2025-0001-01
 */
export async function getNextReportIdForOT(db: Firestore, orderId: string): Promise<string> {
  const reportsQuery = query(
    collection(db, 'informes'),
    where('orderId', '==', orderId)
  );
  
  const snapshot = await getDocs(reportsQuery);
  if (snapshot.empty) return `${orderId}-01`;

  // Encontrar el número más alto
  let maxNum = 0;
  snapshot.docs.forEach(doc => {
    const parts = doc.id.split('-');
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });

  const nextNum = maxNum + 1;
  const suffix = String(nextNum).padStart(2, '0');
  
  return `${orderId}-${suffix}`;
}
