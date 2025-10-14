import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();

    if (!testType) {
      return NextResponse.json(
        { error: 'testType is required' },
        { status: 400 }
      );
    }

    const projectRoot = path.join(process.cwd());
    let command: string;
    let scriptPath: string;

    switch (testType) {
      case 'dellin-api':
        scriptPath = path.join(projectRoot, 'test-dellin-api.js');
        command = `node ${scriptPath}`;
        break;
      case 'performance':
        scriptPath = path.join(projectRoot, 'performance-test.js');
        command = `node ${scriptPath}`;
        break;
      case 'dellin-derival':
        scriptPath = path.join(projectRoot, 'test-dellin-derival.js');
        command = `node ${scriptPath}`;
        break;
      case 'dellin-terminals':
        scriptPath = path.join(projectRoot, 'test-dellin-terminals.js');
        command = `node ${scriptPath}`;
        break;
      case 'dellin-terminals-simple':
        scriptPath = path.join(projectRoot, 'test-dellin-terminals-simple.js');
        command = `node ${scriptPath}`;
        break;
      case 'spb-terminals':
        scriptPath = path.join(projectRoot, 'test-spb-terminals.js');
        command = `node ${scriptPath}`;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown test type: ${testType}` },
          { status: 400 }
        );
    }

    // Check if script exists
    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Test script not found: ${scriptPath}` },
        { status: 404 }
      );
    }

    // Execute the test script
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    const endTime = Date.now();

    const result = {
      testType,
      success: !stderr || stderr.trim() === '',
      output: stdout,
      errors: stderr || null,
      executionTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Test execution error:', error);

    return NextResponse.json(
      {
        testType: 'unknown',
        success: false,
        output: null,
        errors: error.message || 'Unknown error occurred',
        executionTime: 0,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}