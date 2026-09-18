import { classifyDocument } from "./classifier";

const cvText = `
Curriculum Vitae

Education
Master of Artificial Intelligence
Bachelor of Computer Science

Work Experience
Software Developer

Skills
Python
Java
React
`;

const results = classifyDocument(cvText);

console.log(JSON.stringify(results, null, 2));