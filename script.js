document.addEventListener('DOMContentLoaded', function() {
    // Initialize CodeMirror editors
    const htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-code'), {
        mode: 'htmlmixed',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        indentUnit: 4
    });
    
    const cssEditor = CodeMirror.fromTextArea(document.getElementById('css-code'), {
        mode: 'css',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        indentUnit: 4
    });
    
    const jsEditor = CodeMirror.fromTextArea(document.getElementById('js-code'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        indentUnit: 4
    });
    
    const outputFrame = document.getElementById('output');
    const consoleOutput = document.getElementById('console');
    const runBtn = document.getElementById('run-btn');
    const saveBtn = document.getElementById('save-btn');
    const themeBtn = document.getElementById('theme-btn');
    const projectSelect = document.getElementById('project-select');
    
    // Current state
    let currentProject = localStorage.getItem('lastOpenProject') || '';
    let isAutoSaving = false;
    
    // Initialize console capture
    const originalConsole = { ...console };
    
    // --- Core Functions ---
    
    function captureConsole() {
        console.log = function(...args) {
            originalConsole.log(...args);
            logToConsole(args, 'log');
        };
        
        console.error = function(...args) {
            originalConsole.error(...args);
            logToConsole(args, 'error');
        };
        
        console.warn = function(...args) {
            originalConsole.warn(...args);
            logToConsole(args, 'warn');
        };
        
        console.info = function(...args) {
            originalConsole.info(...args);
            logToConsole(args, 'info');
        };
    }
    
    function logToConsole(args, type) {
        const colors = {
            log: '#ffffff',
            error: '#ff5555',
            warn: '#ffb86c',
            info: '#8be9fd'
        };
        consoleOutput.innerHTML += `<span style="color: ${colors[type]}">${args.join(' ')}</span>\n`;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    function restoreConsole() {
        Object.assign(console, originalConsole);
    }
    
    function run() {
        consoleOutput.innerHTML = '';
        captureConsole();
        
        try {
            const html = htmlEditor.getValue();
            const css = cssEditor.getValue();
            const js = jsEditor.getValue();
            
            const doc = outputFrame.contentDocument || outputFrame.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>${css}</style>
                    <script>
                        window.onerror = function(message, source, lineno, colno, error) {
                            parent.console.error(\`Error: \${message} at \${source}:\${lineno}\`);
                            return true;
                        };
                        ${js}
                    </script>
                </head>
                <body>${html}</body>
                </html>
            `);
            doc.close();
            
            outputFrame.contentWindow.console = console;
        } catch (e) {
            console.error('Execution error:', e);
        }
        
        setTimeout(restoreConsole, 1000);
    }
    
    // --- Project Management ---
    
    function loadProjects() {
        const projects = getProjects();
        projectSelect.innerHTML = '<option value="">New Project</option>';
        
        Object.keys(projects).sort((a, b) => 
            projects[b].timestamp.localeCompare(projects[a].timestamp)
        ).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            projectSelect.appendChild(option);
        });
        
        if (currentProject) {
            projectSelect.value = currentProject;
        }
    }
    
    function getProjects() {
        try {
            return JSON.parse(localStorage.getItem('codeEditorProjects')) || {};
        } catch {
            return {};
        }
    }
    
    function saveProject(projectName = projectSelect.value) {
        if (!projectName) {
            projectName = prompt('Project name:');
            if (!projectName) return false;
        }
        
        const projects = getProjects();
        projects[projectName] = {
            html: htmlEditor.getValue(),
            css: cssEditor.getValue(),
            js: jsEditor.getValue(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('codeEditorProjects', JSON.stringify(projects));
        localStorage.setItem('lastOpenProject', projectName);
        
        loadProjects();
        projectSelect.value = projectName;
        currentProject = projectName;
        return true;
    }
    
    function loadSelectedProject() {
        const projects = getProjects();
        const project = projects[projectSelect.value];
        
        if (project) {
            currentProject = projectSelect.value;
            localStorage.setItem('lastOpenProject', currentProject);
            
            htmlEditor.setValue(project.html);
            cssEditor.setValue(project.css);
            jsEditor.setValue(project.js);
            
            run();
        } else {
            currentProject = '';
            localStorage.removeItem('lastOpenProject');
            
            // Clear editors but keep default template if empty
            if (!htmlEditor.getValue()) {
                setDefaultTemplate();
            }
        }
    }
    
    function autoSave() {
        if (isAutoSaving || !currentProject) return;
        
        isAutoSaving = true;
        saveProject(currentProject);
        isAutoSaving = false;
    }
    
    // --- UI Functions ---
    
    function setDefaultTemplate() {
        if (!htmlEditor.getValue()) {
            htmlEditor.setValue(`<!DOCTYPE html>
<html>
<head>
    <title>My Project</title>
</head>
<body>
    <h1>Thanks for opening!</h1>
    <p>Enjoy your code</p>
</body>
</html>`);
            
            cssEditor.setValue(`body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

h1 {
    color: #333;
}`);
            
            jsEditor.setValue(`console.log('JavaScript loaded!');

// Your JavaScript code here
document.querySelector('h1').addEventListener('click', function() {
    alert('You clicked the heading!');
});`);
        }
    }
    
    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? null : 'light';
        document.body.setAttribute('data-theme', newTheme || '');
        
        const cmTheme = newTheme ? 'default' : 'dracula';
        [htmlEditor, cssEditor, jsEditor].forEach(editor => 
            editor.setOption('theme', cmTheme)
        );
        
        themeBtn.innerHTML = newTheme 
            ? '<i class="fas fa-sun"></i> Dark Mode' 
            : '<i class="fas fa-moon"></i> Light Mode';
    }
    
    function setupResizer() {
        const resizer = document.getElementById('resizer');
        const leftPanel = document.querySelector('.left');
        const rightPanel = document.querySelector('.right');
        
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.body.style.cursor = window.innerWidth > 768 ? 'col-resize' : 'row-resize';
            
            function move(e) {
                if (window.innerWidth > 768) {
                    const newLeftWidth = Math.max(20, Math.min(80, (e.clientX / window.innerWidth) * 100));
                    leftPanel.style.width = `${newLeftWidth}%`;
                    rightPanel.style.width = `${100 - newLeftWidth}%`;
                } else {
                    const newLeftHeight = Math.max(20, Math.min(80, (e.clientY / window.innerHeight) * 100));
                    leftPanel.style.height = `${newLeftHeight}%`;
                    rightPanel.style.height = `${100 - newLeftHeight}%`;
                }
            }
            
            function stop() {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', stop);
                document.body.style.cursor = '';
            }
            
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', stop);
        });
    }
    
    // --- Event Listeners ---
    
    runBtn.addEventListener('click', run);
    saveBtn.addEventListener('click', () => saveProject() && run());
    themeBtn.addEventListener('click', toggleTheme);
    projectSelect.addEventListener('change', loadSelectedProject);
    
    // Auto-run with debounce
    let runTimeout;
    function scheduleRun() {
        clearTimeout(runTimeout);
        runTimeout = setTimeout(run, 1000);
    }
    
    // Auto-save with debounce
    let saveTimeout;
    function scheduleSave() {
        if (!currentProject) return;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSave, 2000);
    }
    
    [htmlEditor, cssEditor, jsEditor].forEach(editor => {
        editor.on('change', scheduleRun);
        editor.on('change', scheduleSave);
    });
    
    // Warn before leaving unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (currentProject) {
            autoSave();
        }
    });
    
    // --- Initialization ---
    setupResizer();
    loadProjects();
    
    if (currentProject) {
        loadSelectedProject();
    } else {
        setDefaultTemplate();
        run();
    }
});