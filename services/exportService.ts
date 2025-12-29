import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Player, Note } from '../types';
import { CURRENT_SCOUT, OTHER_SCOUTS } from './mockData';

// Helper to resolve scout name
const getScoutName = (scoutId: string): string => {
  const allScouts = [CURRENT_SCOUT, ...OTHER_SCOUTS];
  const found = allScouts.find(s => s.id === scoutId);
  return found ? found.name : 'Scout Desconocido';
};

// --- EXCEL EXPORT (GROUP) ---
export const exportPlayersToExcel = (players: Player[]) => {
  if (players.length === 0) {
    alert("No hay jugadores para exportar.");
    return;
  }

  // Flatten the data for Excel rows
  const data = players.map(p => ({
    Nombre: p.name,
    Equipo: p.team,
    Posición: p.position,
    País: p.country,
    Edad: p.age,
    Altura: p.height,
    Peso: p.weight,
    Pie: p.foot,
    Valor_Mercado: p.marketValue,
    Rating_Scout: p.scoutRating,
    // Stats
    Ritmo: p.stats.pace,
    Tiro: p.stats.shooting,
    Pase: p.stats.passing,
    Regate: p.stats.dribbling,
    Defensa: p.stats.defending,
    Físico: p.stats.physical,
    // Contract
    Club_Propietario: p.contract?.clubName || p.team,
    Fin_Contrato: p.contract?.contractExpiration || 'N/A',
    Agencia: p.contract?.agencyName || 'N/A',
    Cedido: p.contract?.isLoan ? 'SI' : 'NO',
    // Physical
    Estado_Físico: p.physical?.recoveryStatus || 'N/A',
    Riesgo_Lesión: p.physical?.injuryRisk || 'N/A',
    // Nutrition
    Estado_Peso: p.nutrition?.weightStatus || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jugadores");
  
  // Format filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `LaSquadra_Jugadores_${dateStr}.xlsx`);
};

// --- PDF EXPORT (INDIVIDUAL PROFILE) ---
export const exportPlayerProfileToPDF = (player: Player, notes: Note[]) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [16, 185, 129]; // Emerald 500
  
  // Header Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(player.name.toUpperCase(), 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`LA SQUADRA SCOUTING REPORT | ${dateStr}`, 15, 30);
  
  doc.setFontSize(14);
  doc.setTextColor(212, 175, 55); // Gold
  doc.text(`${player.scoutRating} OVR`, 180, 20, { align: 'right' });

  // Basic Info Section
  let yPos = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMACIÓN PERSONAL", 15, yPos);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPos + 2, 195, yPos + 2);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Column 1
  doc.text(`Equipo: ${player.team}`, 15, yPos);
  doc.text(`Posición: ${player.position}`, 15, yPos + 6);
  doc.text(`País: ${player.country}`, 15, yPos + 12);
  
  // Column 2
  doc.text(`Edad: ${player.age}`, 80, yPos);
  doc.text(`Altura: ${player.height}`, 80, yPos + 6);
  doc.text(`Peso: ${player.weight}`, 80, yPos + 12);
  
  // Column 3
  doc.text(`Pie: ${player.foot}`, 140, yPos);
  doc.text(`Valor Mercado: ${player.marketValue}`, 140, yPos + 6);

  // Stats Section
  yPos += 25;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ATRIBUTOS TÉCNICOS & FÍSICOS", 15, yPos);
  doc.line(15, yPos + 2, 195, yPos + 2);

  yPos += 10;
  const stats = [
    { l: "Ritmo", v: player.stats.pace },
    { l: "Tiro", v: player.stats.shooting },
    { l: "Pase", v: player.stats.passing },
    { l: "Regate", v: player.stats.dribbling },
    { l: "Defensa", v: player.stats.defending },
    { l: "Físico", v: player.stats.physical },
  ];

  stats.forEach((stat, i) => {
    const xOffset = 15 + (i * 30);
    // Box
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(xOffset, yPos, 25, 15, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(stat.l.toUpperCase(), xOffset + 12.5, yPos + 5, { align: 'center' });
    
    // Value
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(stat.v > 80 ? accentColor[0] : 0, stat.v > 80 ? accentColor[1] : 0, stat.v > 80 ? accentColor[2] : 0);
    doc.text(String(stat.v), xOffset + 12.5, yPos + 11, { align: 'center' });
  });

  // Contract & Physical Brief
  yPos += 25;
  doc.setTextColor(0,0,0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ESTADO Y CONTRATO", 15, yPos);
  doc.line(15, yPos + 2, 195, yPos + 2);

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fin Contrato: ${player.contract?.contractExpiration || 'N/A'}`, 15, yPos);
  doc.text(`Agencia: ${player.contract?.agencyName || 'N/A'}`, 15, yPos + 6);
  doc.text(`Estado Préstamo: ${player.contract?.isLoan ? 'CEDIDO' : 'EN PROPIEDAD'}`, 15, yPos + 12);

  doc.text(`Riesgo Lesión: ${player.physical?.injuryRisk || 'N/A'}`, 100, yPos);
  doc.text(`Estado Forma: ${player.nutrition?.weightStatus || 'N/A'}`, 100, yPos + 6);

  // Notes Section
  yPos += 25;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`NOTAS DE SCOUTING DETALLADAS (${notes.length})`, 15, yPos);
  doc.line(15, yPos + 2, 195, yPos + 2);

  yPos += 10;

  if (notes.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("No hay notas registradas.", 15, yPos);
  } else {
      notes.forEach((note) => {
          // Check for page break
          if (yPos > 260) {
              doc.addPage();
              yPos = 20;
          }
          
          const date = new Date(note.timestamp).toLocaleDateString() + ' ' + new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const scoutName = getScoutName(note.scoutId);

          // Note Header (Grey Box)
          doc.setFillColor(248, 250, 252);
          doc.rect(15, yPos - 4, 180, 12, 'F');
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`[${note.category.toUpperCase()}]`, 18, yPos + 2);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139); // Slate 500
          doc.text(` |  ${date}  |  Scout: ${scoutName}`, 50, yPos + 2);
          
          yPos += 12;

          // Note Content
          doc.setTextColor(30, 41, 59); // Slate 800
          doc.setFontSize(10);
          const splitText = doc.splitTextToSize(note.content, 170);
          doc.text(splitText, 18, yPos);
          
          yPos += (splitText.length * 5) + 3;

          // Tags
          if (note.tags && note.tags.length > 0) {
             doc.setFontSize(8);
             doc.setTextColor(16, 185, 129); // Emerald
             doc.setFont("helvetica", "bold");
             doc.text(`Etiquetas: ${note.tags.join(', ')}`, 18, yPos);
             yPos += 5;
          }

          // Attachments
          if (note.attachments && note.attachments.length > 0) {
             doc.setFontSize(8);
             doc.setTextColor(71, 85, 105); // Slate 600
             doc.setFont("helvetica", "italic");
             const attText = note.attachments.map(a => `${a.name} (${a.type})`).join(', ');
             doc.text(`Adjuntos: ${attText}`, 18, yPos);
             yPos += 5;
          }

          // Separator padding
          yPos += 5;
      });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generado por La Squadra Scouting App", 105, 290, { align: 'center' });

  doc.save(`${player.name.replace(/\s+/g, '_')}_Perfil.pdf`);
};

// --- EXPORT AI REPORT ONLY ---
export const exportAIReportToPDF = (player: Player, reportContent: string) => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Header
    doc.setFillColor(126, 34, 206); // Purple 700
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE SCOUTING IA", 15, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${player.name} | ${player.team} | ${dateStr}`, 15, 22);

    // Content
    let yPos = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    const lines = reportContent.split('\n');
    
    lines.forEach((line) => {
        if (yPos > 275) {
            doc.addPage();
            yPos = 20;
        }

        // Clean markdown symbols roughly
        const cleanLine = line.replace(/\*\*/g, '').replace(/#/g, '');
        const isHeader = line.includes('**') || line.includes('#');

        if (isHeader) {
            yPos += 2;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(88, 28, 135); // Dark Purple
        } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85); // Slate 700
        }

        const splitText = doc.splitTextToSize(cleanLine, 180);
        doc.text(splitText, 15, yPos);
        
        yPos += (splitText.length * 5) + 2; 
        
        if (isHeader) yPos += 2; // Extra padding after headers
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generado por Gemini AI via La Squadra App", 105, 290, { align: 'center' });

    doc.save(`${player.name.replace(/\s+/g, '_')}_IA_Reporte.pdf`);
};