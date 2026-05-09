$ports = @(8761, 8080, 8082, 8089, 5000, 4200)

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

Write-Host "Starting Eureka Server..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd eureka-server; .\mvnw.cmd spring-boot:run`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"
Start-Sleep -Seconds 15

Write-Host "Starting API Gateway..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd api-gateway; .\mvnw.cmd spring-boot:run`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"

Write-Host "Starting backpi..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd backpi; .\mvnw.cmd spring-boot:run`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"

Write-Host "Starting patient-medecin-service..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd patient-medecin-service; .\mvnw.cmd spring-boot:run`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"

Write-Host "Starting Flask API..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd flask_api; python app.py`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"

Write-Host "Starting Angular Frontend..."
Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd frontend; npm start`"" -WorkingDirectory "d:\projet_pi_\projet_pi_cloud"

Write-Host "All services have been launched in new terminal windows."
