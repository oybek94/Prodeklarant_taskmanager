const fs = require('fs');

const path = 'g:/Prodeklarant/frontend/src/components/tasks/TaskDetailPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const marker1 = '        {/* Foyda hisoboti - barcha foydalanuvchilar uchun */}';
const marker2 = '        {selectedTask.comments && (';
const marker3 = '        {/* Stages - Checklist */}';
const marker4 = '        {/* Documents Section */}';

const idx1 = content.indexOf(marker1);
const idx3 = content.indexOf(marker3);
const idx4 = content.indexOf(marker4);

if (idx1 !== -1 && idx3 !== -1 && idx4 !== -1) {
    const part0 = content.substring(0, idx1);
    const foydaAndComments = content.substring(idx1, idx3);
    let stages = content.substring(idx3, idx4);
    
    // add a bottom margin to the stages block so it separates nicely from the next section (Financial Report)
    stages = stages.replace('        <div>\n          <h3 className="text-base', '        <div className="mb-6">\n          <h3 className="text-base');
    
    // add top margin to foyda and comments separator if necessary (actually `Foyda hisoboti` starts with a margin-bottom, but maybe it needs margin top? Wait, it already has `mb-5 relative ...` so it's fine. It might border nicely.)

    const docsAndRest = content.substring(idx4);

    const newContent = part0 + stages + foydaAndComments + docsAndRest;
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Success");
} else {
    console.log("Failed to find markers", {idx1, idx3, idx4});
}
