
import fs from 'fs';
import path from 'path';

function generateImportSQL() {
  const migrationDir = './migration/exported-data';
  
  if (!fs.existsSync(migrationDir)) {
    console.error('No exported data found. Run export-data.js first.');
    return;
  }

  let importSQL = `-- Data Import SQL\n-- Generated on: ${new Date().toISOString()}\n\n`;
  
  // Define table order for referential integrity
  const tableOrder = ['users', 'exercises', 'userProgress', 'feedback', 'passwordResetTokens', 'tools', 'aiModels'];
  
  for (const tableName of tableOrder) {
    const filePath = path.join(migrationDir, `${tableName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${tableName} - no data file found`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.length === 0) {
      console.log(`Skipping ${tableName} - no data`);
      continue;
    }

    // Convert camelCase to snake_case for table names
    const sqlTableName = tableName.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    importSQL += `-- Import data for ${sqlTableName}\n`;
    
    for (const record of data) {
      const columns = Object.keys(record).map(key => 
        key.replace(/([A-Z])/g, '_$1').toLowerCase()
      );
      const values = Object.values(record).map(value => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value;
        if (Array.isArray(value)) return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      
      importSQL += `INSERT INTO ${sqlTableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    importSQL += '\n';
  }

  fs.writeFileSync('./migration/import-data.sql', importSQL);
  console.log('SQL import script generated at migration/import-data.sql');
}

generateImportSQL();
