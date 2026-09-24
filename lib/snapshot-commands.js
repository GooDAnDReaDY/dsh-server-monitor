export const SNAPSHOT_COMMAND = [
  "printf '__DSH_SECTION__:identity\\n'",
  "hostname 2>/dev/null || true",
  "uname -s 2>/dev/null || true",
  "uname -r 2>/dev/null || true",
  "uname -m 2>/dev/null || true",
  "awk -F: '/^model name/{print $2; exit}' /proc/cpuinfo 2>/dev/null || true",
  "nproc 2>/dev/null || awk '/^processor/{n++} END{print n+0}' /proc/cpuinfo 2>/dev/null || true",
  "printf '__DSH_SECTION__:system\\n'",
  "cat /proc/loadavg 2>/dev/null || true",
  "uptime -p 2>/dev/null || uptime 2>/dev/null || true",
  "free -m 2>/dev/null || true",
  "printf '__DSH_SECTION__:disk\\n'",
  "df -P -k -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null || df -P -k 2>/dev/null || true",
  "printf '__DSH_SECTION__:processes\\n'",
  "ps -eo pid=,comm=,pcpu=,pmem=,user= --sort=-pcpu 2>/dev/null | head -n 13 || true",
  "printf '__DSH_SECTION__:containers\\n'",
  "if command -v docker >/dev/null 2>&1; then docker ps --format '{{json .}}' 2>/dev/null || true; elif command -v podman >/dev/null 2>&1; then podman ps --format '{{json .}}' 2>/dev/null || true; fi",
  "printf '__DSH_SECTION__:network1\\n'",
  "cat /proc/net/dev 2>/dev/null || true",
  "sleep 1",
  "printf '__DSH_SECTION__:network\\n'",
  "cat /proc/net/dev 2>/dev/null || true",
  "printf '__DSH_SECTION__:ports\\n'",
  "ss -ltnupH 2>/dev/null || netstat -ltnup 2>/dev/null || true"
].join('; ');

export const BSD_LINK_AWK = '$3 ~ /^<Link/ { printf "%s: %s 0 0 0 0 0 0 0 %s 0\\n", $1, $(NF-4), $(NF-1) }';

const BSD_SNAPSHOT = `
printf '__DSH_SECTION__:identity\\n'
printf '%s\\n' "$(hostname 2>/dev/null || echo -)"
printf '%s\\n' "$(uname -s 2>/dev/null || echo -)"
printf '%s\\n' "$(uname -r 2>/dev/null || echo -)"
printf '%s\\n' "$(uname -m 2>/dev/null || echo -)"
printf '%s\\n' "$(sysctl -n machdep.cpu.brand_string 2>/dev/null || sysctl -n hw.model 2>/dev/null || echo -)"
printf '%s\\n' "$(sysctl -n hw.ncpu 2>/dev/null || echo 0)"
printf '__DSH_SECTION__:system\\n'
sysctl -n vm.loadavg 2>/dev/null | tr -d '{}"' || true
printf 'up %s\\n' "$(uptime 2>/dev/null || echo unknown)"
total_bytes=$(sysctl -n hw.memsize 2>/dev/null || sysctl -n hw.physmem 2>/dev/null || echo 0)
page=$(sysctl -n hw.pagesize 2>/dev/null || echo 4096)
free_pages=0
spec_pages=0
if command -v vm_stat >/dev/null 2>&1; then
  free_pages=$(vm_stat | awk '/Pages free/ { gsub(/[^0-9]/, "", $NF); print $NF }')
  spec_pages=$(vm_stat | awk '/Pages speculative/ { gsub(/[^0-9]/, "", $NF); print $NF }')
else
  free_pages=$(sysctl -n vm.stats.vm.v_free_count 2>/dev/null || echo 0)
fi
free_pages=\${free_pages:-0}
spec_pages=\${spec_pages:-0}
free_pages=$((free_pages + spec_pages))
total_mb=$((total_bytes / 1048576))
free_mb=$((free_pages * page / 1048576))
if [ "$free_mb" -gt "$total_mb" ]; then free_mb=$total_mb; fi
used_mb=$((total_mb - free_mb))
printf 'Mem: %s %s %s 0 0 %s\\n' "$total_mb" "$used_mb" "$free_mb" "$free_mb"
printf 'Swap: 0 0 0\\n'
printf '__DSH_SECTION__:disk\\n'
df -P -k 2>/dev/null || true
printf '__DSH_SECTION__:processes\\n'
ps -axo pid=,comm=,pcpu=,pmem=,user= 2>/dev/null | sort -nrk 3 | head -n 12 || true
printf '__DSH_SECTION__:containers\\n'
printf '__DSH_SECTION__:network1\\n'
netstat -ibn 2>/dev/null | awk '${BSD_LINK_AWK}' || true
sleep 1
printf '__DSH_SECTION__:network\\n'
netstat -ibn 2>/dev/null | awk '${BSD_LINK_AWK}' || true
printf '__DSH_SECTION__:ports\\n'
`.trim();

export const WINDOWS_SNAPSHOT = `
function Line([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { Write-Output '-' } else { Write-Output $value }
}
Write-Output '__DSH_SECTION__:identity'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = @(Get-CimInstance Win32_Processor)
Line $env:COMPUTERNAME
Line $os.Caption
Line $os.Version
Line $env:PROCESSOR_ARCHITECTURE
Line (($cpu | Select-Object -First 1).Name)
$cores = [int](($cpu | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum)
if ($cores -lt 1) { $cores = 1 }
Line $cores
Write-Output '__DSH_SECTION__:system'
$busy = [double](($cpu | Measure-Object -Property LoadPercentage -Average).Average)
if ($busy -lt 0) { $busy = 0 }
$load = [math]::Round($busy / 100 * $cores, 2)
Write-Output "$load 0 0"
if ($os.LastBootUpTime) {
  $span = (Get-Date) - $os.LastBootUpTime
  Write-Output ('up {0}d {1}h {2}m' -f [int]$span.Days, [int]$span.Hours, [int]$span.Minutes)
} else { Write-Output 'up' }
$total = [int]($os.TotalVisibleMemorySize / 1024)
$free = [int]($os.FreePhysicalMemory / 1024)
if ($free -gt $total) { $free = $total }
$used = $total - $free
Write-Output "Mem: $total $used $free 0 0 $free"
Write-Output 'Swap: 0 0 0'
Write-Output '__DSH_SECTION__:disk'
Write-Output 'Filesystem 1024-blocks Used Available Capacity Mounted on'
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
  $totalKb = [int64]($_.Size / 1024)
  $freeKb = [int64]($_.FreeSpace / 1024)
  if ($freeKb -gt $totalKb) { $freeKb = $totalKb }
  $usedKb = $totalKb - $freeKb
  $pct = 0
  if ($totalKb -gt 0) { $pct = [int](100 * $usedKb / $totalKb) }
  Write-Output ("{0} {1} {2} {3} {4}% {5}" -f $_.DeviceID, $totalKb, $usedKb, $freeKb, $pct, $_.DeviceID)
}
Write-Output '__DSH_SECTION__:processes'
Write-Output '__DSH_SECTION__:containers'
function Write-Nics {
  Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | ForEach-Object {
    $name = $_.Name -replace ':', '-'
    Write-Output ("{0}: {1} 0 0 0 0 0 0 0 {2} 0" -f $name, [int64]$_.BytesReceivedPersec, [int64]$_.BytesSentPersec)
  }
}
Write-Output '__DSH_SECTION__:network1'
Write-Nics
Start-Sleep -Seconds 1
Write-Output '__DSH_SECTION__:network'
Write-Nics
Write-Output '__DSH_SECTION__:ports'
`.trim();

export function snapshotCommand(profile) {
  if (profile?.shell === 'powershell') return WINDOWS_SNAPSHOT;
  return `if [ -r /proc/meminfo ]; then\n${SNAPSHOT_COMMAND}\nelse\n${BSD_SNAPSHOT}\nfi`;
}

export function shouldRetryWithPowerShell(profile, result) {
  if (profile?.shell === 'powershell' || result?.stdout) return false;
  return /\/bin\/sh|CreateProcess|not recognized as an internal/i.test(String(result?.stderr || ''));
}
