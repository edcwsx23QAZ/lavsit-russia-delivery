# Business Rules and Development Protocols

> **Technical Guidelines:** For Next.js 14, TypeScript, database, and UI/styling rules, see `.ideavorules`

## Core Development Principles

### Problem-Solving Philosophy
- **No shortcuts:** Find root cause, not workarounds
- **Precision over rewrites:** Make targeted fixes, don't rewrite entire files
- **Research first:** If confidence <95%, conduct deep research
- **Autonomous action:** Fix errors and commit changes independently
- **Document confidence:** State confidence level (0-100%) for each action

### Challenge Protocol (Mandatory)
After every significant implementation:
1. **Verify results:** Read logs, identify what was missed or incorrect
2. **Falsify conclusions:** Challenge your hypothesis and findings
3. **Organize files:** Ensure everything is in proper location
4. **Document gaps:** Note what might confuse team members
5. **Check expectations:** Compare actual vs expected output

## Quality Assurance Standards

### Independent Validation
- **Cross-check requirement:** Never confirm without verification
- **Output validation:** Use validation commands for results
- **Test case planning:** Design tests following AI QA Standard
- **Manual testing:** Document results and fixes needed

### Testing Protocols
- Run build validation after significant changes
- Test edge cases and error conditions
- Validate user workflows end-to-end
- Document test results and any issues found

## Git and Synchronization

### Version Control Guidelines
- **Sync changes:** Only when confidence >90%
- **Merge strategy:** Conduct deep research and discuss strategy first
- **Confirmation required:** Merge only after strategy approval

## Project-Specific Guidelines

### Transport Company Integration
- API endpoints: PEK, Delovye Linii, Rail Continent, Vozovoz, Nord Wheel
- Diagnostic page at `/diagnostic` for API testing
- Google Sheets integration for product data
- 3D cargo placement algorithms with rotation support

### Cargo Placement Rules (Business Logic)
- **Container dimensions:** 4200×2025×2025mm (L×W×H)
- **Rotation allowed:** All cargo can be rotated and stacked
- **Weight constraints:** Heavier items cannot go on lighter items
- **Special rules for chairs/stools:** No horizontal rotation, max 2 stacked
- **Optimization goal:** Minimize floor area usage
- **Placement precision:** 25mm grid for positioning
- **48 orientation variants:** 6 base orientations × 8 rotation angles

## Heroes Platform Structure

### Project Organization
- **Main folder:** heroes-platform/
- **MCP Server:** heroes-platform/mcp_server/
- **Configuration:** pyproject.toml, setup.py, Makefile
- **Testing:** run_tests.py (bypasses pytest issues)
- **Commands:** make test, make lint, make format

## File Organization Standards

### Documentation Hierarchy
1. **`.ideavorules`** - Technical development guidelines (Next.js, TypeScript, database)
2. **`project-rules.md`** - Business rules and workflow protocols (this file)
3. **`project.todo.md`** - Active tasks and progress tracking
4. **`/app/diagnostic/page.tsx`** - Live project status and testing interface

### Protected Files
Never modify these files:
- `components/ui/*` - shadcn/ui components
- `hooks/use-toast.ts` - Toast hook implementation
- `.gitignore` - Git ignore configuration
- `.ideavo/*` - IDE configuration

## Confidence and Decision Making

### Confidence Levels
- **<70%:** Stop and research further
- **70-90%:** Proceed with caution, document assumptions
- **>90%:** Proceed confidently
- **95%+:** Optimal confidence for autonomous action

### Action Documentation
For each significant action, document:
- Confidence level (0-100%)
- Assumptions made
- Potential risks
- Validation steps taken