import { projectId, publicAnonKey } from '../utils/supabase/info';

const questions = [
  {
    "id": "question:1731610800000-a1b2c3d4e",
    "status": "Draft",
    "options": [
      "The practical safeguarding of persons and property from hazards arising from the use of electricity",
      "The standardization of electrical installations across all states",
      "The regulation of electrical utility companies",
      "The enforcement of electrical contractor licensing requirements"
    ],
    "category": "NEC 90 - Introduction",
    "question": "What is the primary purpose of the National Electrical Code?",
    "reference": "NEC 90.1(A)",
    "createdAt": "2025-11-14T18:00:00.000Z",
    "updatedAt": "2025-11-14T18:00:00.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Easy",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610801000-b2c3d4e5f",
    "status": "Draft",
    "options": [
      "Installations by electric utilities for generation",
      "Installations in buildings used by the electric utility",
      "Installations of optical fiber cables under utility control",
      "Installations of communications equipment in dwelling units"
    ],
    "category": "NEC 90 - Introduction",
    "question": "Which of the following installations is NOT covered by the NEC?",
    "reference": "NEC 90.2(B)(5)",
    "createdAt": "2025-11-14T18:00:01.000Z",
    "updatedAt": "2025-11-14T18:00:01.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Medium",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610802000-c3d4e5f6g",
    "status": "Draft",
    "options": [
      "The authority having jurisdiction",
      "The National Fire Protection Association",
      "The electrical contractor performing the work",
      "The building owner or occupant"
    ],
    "category": "NEC 90 - Introduction",
    "question": "Who has the responsibility for making interpretations of rules and for deciding upon the approval of equipment and materials?",
    "reference": "NEC 90.4",
    "createdAt": "2025-11-14T18:00:02.000Z",
    "updatedAt": "2025-11-14T18:00:02.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Easy",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610803000-d4e5f6g7h",
    "status": "Draft",
    "options": [
      "Shall",
      "Should",
      "May",
      "Recommended"
    ],
    "category": "NEC 90 - Introduction",
    "question": "Which term indicates a mandatory requirement in the NEC?",
    "reference": "NEC 90.5(A)",
    "createdAt": "2025-11-14T18:00:03.000Z",
    "updatedAt": "2025-11-14T18:00:03.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Easy",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610804000-e5f6g7h8i",
    "status": "Draft",
    "options": [
      "Text in brackets containing section references",
      "Fine Print Notes (FPNs)",
      "Material identified by the superscript letter 'x'",
      "Informational notes following code sections"
    ],
    "category": "NEC 90 - Introduction",
    "question": "What type of material in the NEC is explanatory and not mandatory?",
    "reference": "NEC 90.5(C)",
    "createdAt": "2025-11-14T18:00:04.000Z",
    "updatedAt": "2025-11-14T18:00:04.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Medium",
    "correctAnswer": 3
  },
  {
    "id": "question:1731610805000-f6g7h8i9j",
    "status": "Draft",
    "options": [
      "Chapters 1, 2, 3, and 4",
      "Chapters 5, 6, and 7",
      "Chapter 8",
      "Chapter 9"
    ],
    "category": "NEC 90 - Introduction",
    "question": "Which chapters of the NEC apply generally to all electrical installations?",
    "reference": "NEC 90.3",
    "createdAt": "2025-11-14T18:00:05.000Z",
    "updatedAt": "2025-11-14T18:00:05.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Medium",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610806000-g7h8i9j0k",
    "status": "Draft",
    "options": [
      "Always apply unless specifically modified",
      "Only apply if referenced by other chapters",
      "Are optional recommendations only",
      "Apply only to commercial installations"
    ],
    "category": "NEC 90 - Introduction",
    "question": "How do Chapters 5, 6, and 7 of the NEC relate to Chapters 1 through 4?",
    "reference": "NEC 90.3",
    "createdAt": "2025-11-14T18:00:06.000Z",
    "updatedAt": "2025-11-14T18:00:06.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Hard",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610807000-h8i9j0k1l",
    "status": "Draft",
    "options": [
      "Wiring methods and materials shall be examined for safety",
      "All installations must use the newest available materials",
      "Only listed equipment can be used in electrical installations",
      "Equipment must be approved by the manufacturer"
    ],
    "category": "NEC 90 - Introduction",
    "question": "What does the NEC require regarding the examination of equipment for safety?",
    "reference": "NEC 90.7",
    "createdAt": "2025-11-14T18:00:07.000Z",
    "updatedAt": "2025-11-14T18:00:07.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Medium",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610808000-i9j0k1l2m",
    "status": "Draft",
    "options": [
      "Communications systems covered by Chapter 8",
      "Dwelling unit branch circuits and feeders",
      "Industrial machinery covered by Article 670",
      "Emergency systems covered by Article 700"
    ],
    "category": "NEC 90 - Introduction",
    "question": "Which installations are generally independent of the general rules in Chapters 1 through 4?",
    "reference": "NEC 90.3",
    "createdAt": "2025-11-14T18:00:08.000Z",
    "updatedAt": "2025-11-14T18:00:08.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Hard",
    "correctAnswer": 0
  },
  {
    "id": "question:1731610809000-j0k1l2m3n",
    "status": "Draft",
    "options": [
      "Metric units are primary, inch-pound units are shown in parentheses",
      "Inch-pound units are primary, metric units are shown in parentheses",
      "Only metric units are used throughout the code",
      "Only inch-pound units are used throughout the code"
    ],
    "category": "NEC 90 - Introduction",
    "question": "How are units of measurement presented in the NEC?",
    "reference": "NEC 90.9(C)(4)",
    "createdAt": "2025-11-14T18:00:09.000Z",
    "updatedAt": "2025-11-14T18:00:09.000Z",
    "created_by": "ai_content_team",
    "difficulty": "Easy",
    "correctAnswer": 1
  }
];

async function addQuestions() {
  console.log('🚀 Adding 10 NEC 90 - Introduction questions...\n');
  
  // You'll need to replace this with a valid admin access token
  const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE';
  
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-a9be5165`;
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const question of questions) {
    try {
      const response = await fetch(`${serverUrl}/admin/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(question),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added: ${question.question.substring(0, 60)}...`);
        successCount++;
      } else {
        console.error(`❌ Failed: ${question.id} - ${result.error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error adding ${question.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} succeeded, ${errorCount} failed`);
}

// Run the script
addQuestions();
