const fs = require('fs');
let c = fs.readFileSync('g:/Prodeklarant/backend/src/routes/dashboard.ts', 'utf8');

const regex = /const tempMap = new Map<number, Set<number>>\(\);([\s\S]*?)for \(const \[wId, tSet\] of tempMap\.entries\(\)\) {([\s\S]*?)completedStagesMap\.set\(wId, tSet\.size\);\s*}/;

const replacement = `const completedStagesMap = new Map<number, number>();
      completedStagesByWorker.forEach((item) => {
        if (item.assignedToId !== null) {
          const currentCount = completedStagesMap.get(item.assignedToId) || 0;
          completedStagesMap.set(item.assignedToId, currentCount + 1);
        }
      });`;

const updated = c.replace(regex, replacement);
fs.writeFileSync('g:/Prodeklarant/backend/src/routes/dashboard.ts', updated);
console.log("Successfully replaced deduplication block in dashboard.ts");
