$ports = @(8761, 8080, 8081, 8082, 8084, 8085, 8086, 8087, 8089, 8095, 5000, 5001, 8000, 4200)

Write-Host "--- AlzCare System Startup ---" -ForegroundColor Cyan
Write-Host "Killing processes on ports: $($ports -join ', ')"
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $processIds = $connections.OwningProcess | Select-Object -Unique
        foreach ($pid_ in $processIds) {
            Write-Host "Killing PID $pid_ on port $port"
            Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        }
    }
}

$workDir = "d:\projet_pi_\projet_pi_cloud"

function Start-ServiceWindow {
    param($name, $dir, $command)
    Write-Host "Starting $name..." -ForegroundColor Yellow
    Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd $dir; $command`"" -WorkingDirectory $workDir
}

# 1. Eureka Server
Start-ServiceWindow "Eureka Server" "eureka-server" ".\mvnw.cmd spring-boot:run"
Write-Host "Waiting 15s for Eureka to initialize..."
Start-Sleep -Seconds 15

# 2. API Gateway
Start-ServiceWindow "API Gateway" "api-gateway" ".\mvnw.cmd spring-boot:run"

# 3. Core Backends
Start-ServiceWindow "backpi (Auth/Core)" "backpi" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "patient-medecin-service" "patient-medecin-service" ".\mvnw.cmd spring-boot:run"

# 4. Domain Services
Start-ServiceWindow "collab-service" "collab-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "donation-service" "donation-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "rendezvous-service" "rendezvous-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "education-service" "education-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "geo-service" "geo-service" ".\mvnw.cmd spring-boot:run"
Start-ServiceWindow "smartwatch-service" "smartwatch-service" ".\mvnw.cmd spring-boot:run"

# 5. AI Services
Start-ServiceWindow "flask_api (Port 5000)" "flask_api" "python app.py"
Start-ServiceWindow "pkl_inference_api (Port 5001)" "pkl_inference_api" "python app.py"
Start-ServiceWindow "ai-server (Port 8000)" "ai-server" "uvicorn main:app --port 8000"

# 6. Frontend
Start-ServiceWindow "Angular Frontend" "frontend" "npm start"

Write-Host "`n--- All services have been launched in new terminal windows ---" -ForegroundColor Green
Write-Host "Check Eureka dashboard at: http://localhost:8761"
Write-Host "Check Frontend at: http://localhost:4200"
