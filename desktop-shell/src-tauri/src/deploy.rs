use std::fs::{self, File};
use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

const FILE_NAME: &str = "deployment.json";
const API: &str = "https://api.digitalocean.com/v2";
pub const BILLING_URL: &str = "https://cloud.digitalocean.com/account/billing";
pub const TOKEN_URL: &str = "https://cloud.digitalocean.com/account/api/tokens";
pub const RESEND_URL: &str = "https://resend.com/api-keys";
pub const DROPLET_SIZE: &str = "s-2vcpu-4gb";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentConfig {
    #[serde(default)]
    pub digital_ocean_token: String,
    #[serde(default)]
    pub resend_api_key: String,
    #[serde(default)]
    pub from_email: String,
    #[serde(default)]
    pub admin_email: String,
    #[serde(default)]
    pub admin_password: String,
    #[serde(default = "default_region")]
    pub region: String,
    #[serde(default)]
    pub size: String,
    #[serde(default)]
    pub ssh_public_key: String,
    #[serde(default)]
    pub ssh_private_key: String,
    #[serde(default)]
    pub ssh_key_id: String,
    #[serde(default)]
    pub droplet_id: u64,
    #[serde(default)]
    pub droplet_name: String,
    #[serde(default)]
    pub public_ip: String,
    #[serde(default)]
    pub db_password: String,
    #[serde(default)]
    pub encryption_key: String,
    #[serde(default)]
    pub secret_key: String,
}

fn default_region() -> String {
    "nyc3".into()
}

impl Default for DeploymentConfig {
    fn default() -> Self {
        Self {
            digital_ocean_token: String::new(),
            resend_api_key: String::new(),
            from_email: String::new(),
            admin_email: String::new(),
            admin_password: String::new(),
            region: default_region(),
            size: String::new(),
            ssh_public_key: String::new(),
            ssh_private_key: String::new(),
            ssh_key_id: String::new(),
            droplet_id: 0,
            droplet_name: String::new(),
            public_ip: String::new(),
            db_password: String::new(),
            encryption_key: String::new(),
            secret_key: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentInput {
    pub digital_ocean_token: String,
    pub resend_api_key: String,
    pub from_email: String,
    pub admin_email: String,
    pub region: String,
    pub size: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentView {
    pub has_digital_ocean_token: bool,
    pub has_resend_api_key: bool,
    pub region: String,
    pub size: String,
    pub droplet_id: u64,
    pub droplet_name: String,
    pub public_ip: String,
    pub admin_password: String,
    pub status: String,
    pub running: bool,
    pub app_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionChoice {
    pub slug: String,
    pub name: String,
}

pub fn config_path(data_dir: &Path) -> PathBuf {
    data_dir.join(FILE_NAME)
}

pub fn ensure_config(data_dir: &Path) -> Result<DeploymentConfig, String> {
    fs::create_dir_all(data_dir)
        .map_err(|err| format!("Could not create the app data folder: {err}"))?;
    let path = config_path(data_dir);
    if !path.is_file() {
        let config = DeploymentConfig::default();
        write_config(&path, &config)?;
        return Ok(config);
    }
    read_config(&path)
}

pub fn save_input(data_dir: &Path, input: DeploymentInput) -> Result<DeploymentConfig, String> {
    let mut config = ensure_config(data_dir)?;
    if let Some(token) = nonempty(&input.digital_ocean_token) {
        reject_secret_text("DigitalOcean API token", token)?;
        config.digital_ocean_token = token.to_string();
    }
    if let Some(key) = nonempty(&input.resend_api_key) {
        reject_secret_text("Resend API key", key)?;
        config.resend_api_key = key.to_string();
    }
    if let Some(email) = nonempty(&input.from_email) {
        reject_secret_text("From email", email)?;
        config.from_email = email.to_string();
    }
    if let Some(email) = nonempty(&input.admin_email) {
        reject_secret_text("Admin email", email)?;
        config.admin_email = email.to_string();
    }
    if let Some(region) = nonempty(&input.region) {
        if !valid_region(region) {
            return Err("Choose a place close to your team.".into());
        }
        config.region = region.to_string();
    }
    config.size = DROPLET_SIZE.into();
    write_config(&config_path(data_dir), &config)?;
    Ok(config)
}

pub fn delete_droplet(data_dir: &Path) -> Result<DeploymentConfig, String> {
    let mut config = ensure_config(data_dir)?;
    if config.droplet_id != 0 {
        let path = format!("/droplets/{}", config.droplet_id);
        match do_request(&config.digital_ocean_token, "DELETE", &path, None) {
            Ok(_) => {}
            Err(err) if err.contains("404") => {}
            Err(err) => return Err(plain_failure(&err)),
        }
    }
    config.droplet_id = 0;
    config.public_ip.clear();
    write_config(&config_path(data_dir), &config)?;
    Ok(config)
}

pub fn forget_resource(data_dir: &Path, kind: &str) -> Result<DeploymentConfig, String> {
    let mut config = ensure_config(data_dir)?;
    match kind {
        "token" => {
            if config.droplet_id != 0 {
                return Err("Remove the computer first. After that, you can remove the DigitalOcean key.".into());
            }
            config.digital_ocean_token.clear();
        }
        "resend" => config.resend_api_key.clear(),
        _ => return Err("That item cannot be removed.".into()),
    }
    write_config(&config_path(data_dir), &config)?;
    Ok(config)
}

pub fn verify_token(token: &str) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("Paste the key from DigitalOcean.".into());
    }
    do_request(token.trim(), "GET", "/account", None)
        .map(|_| ())
        .map_err(|err| plain_failure(&err))
}

pub fn export_configuration(data_dir: &Path, destination: &Path) -> Result<(), String> {
    if destination.as_os_str().is_empty() {
        return Err("Choose where to save the copy.".into());
    }
    if destination == config_path(data_dir) {
        return Err("Choose a different folder for the copy.".into());
    }
    let config = ensure_config(data_dir)?;
    if config.public_ip.is_empty() {
        return Err("Finish making your app before you save a copy.".into());
    }
    let bytes = serde_json::to_vec_pretty(&config).map_err(|err| err.to_string())?;
    write_private_file(destination, &bytes)
}

pub fn list_regions(token: &str) -> Result<Vec<RegionChoice>, String> {
    let body = do_request(token, "GET", "/regions?per_page=200", None).map_err(|err| plain_failure(&err))?;
    let regions = body
        .get("regions")
        .and_then(Value::as_array)
        .ok_or_else(|| "DigitalOcean did not offer any places. Try again in a moment.".to_string())?;
    let mut listed = Vec::new();
    for region in regions {
        if !region_is_offered(region) {
            continue;
        }
        let Some(slug) = region.get("slug").and_then(Value::as_str) else {
            continue;
        };
        let name = region
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or(slug);
        listed.push(RegionChoice {
            slug: slug.to_string(),
            name: name.to_string(),
        });
    }
    listed.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(listed)
}

pub fn view(config: DeploymentConfig, status: &str, running: bool) -> DeploymentView {
    let app_url = if config.public_ip.is_empty() {
        String::new()
    } else {
        format!("http://{}", config.public_ip)
    };
    DeploymentView {
        has_digital_ocean_token: !config.digital_ocean_token.is_empty(),
        has_resend_api_key: !config.resend_api_key.is_empty(),
        region: config.region,
        size: if config.size.is_empty() {
            DROPLET_SIZE.into()
        } else {
            config.size
        },
        droplet_id: config.droplet_id,
        droplet_name: config.droplet_name,
        public_ip: config.public_ip,
        admin_password: config.admin_password,
        status: status.to_string(),
        running,
        app_url,
    }
}

pub fn provision(data_dir: &Path, report: &mut dyn FnMut(String)) -> Result<DeploymentConfig, String> {
    let mut config = ensure_config(data_dir)?;
    require_field(&config.digital_ocean_token, "The DigitalOcean key")?;
    require_field(&config.resend_api_key, "The email key")?;
    require_field(&config.region, "A place close to your team")?;
    config.size = DROPLET_SIZE.into();
    if config.from_email.is_empty() {
        config.from_email = "onboarding@resend.dev".into();
    }
    if config.admin_email.is_empty() {
        config.admin_email = "admin@localhost".into();
    }
    if config.admin_password.is_empty() {
        config.admin_password = random_token(20);
    }
    if config.db_password.is_empty() {
        config.db_password = random_token(24);
    }
    if config.encryption_key.is_empty() {
        config.encryption_key = random_token(32);
    }
    if config.secret_key.is_empty() {
        config.secret_key = random_token(32);
    }
    if config.droplet_name.is_empty() {
        config.droplet_name = "documents-backend".into();
    }
    write_config(&config_path(data_dir), &config)?;

    if config.ssh_private_key.is_empty() || config.ssh_public_key.is_empty() {
        report(working_message());
        generate_ssh_key(data_dir, &mut config)?;
        write_config(&config_path(data_dir), &config)?;
    }
    if config.ssh_key_id.is_empty() {
        report(working_message());
        let created = do_request(
            &config.digital_ocean_token,
            "POST",
            "/account/keys",
            Some(json!({
                "name": "documents-shell",
                "public_key": config.ssh_public_key,
            })),
        )?;
        config.ssh_key_id = created
            .pointer("/ssh_key/id")
            .and_then(Value::as_u64)
            .map(|id| id.to_string())
            .ok_or_else(|| "DigitalOcean did not finish saving the key. Try again.".to_string())?;
        write_config(&config_path(data_dir), &config)?;
    }

    if config.droplet_id == 0 || config.public_ip.is_empty() {
        report(working_message());
        let key_id: u64 = config
            .ssh_key_id
            .parse()
            .map_err(|_| "The saved SSH key id is not a number.".to_string())?;
        let created = do_request(
            &config.digital_ocean_token,
            "POST",
            "/droplets",
            Some(json!({
                "name": config.droplet_name,
                "region": config.region,
                "size": config.size,
                "image": "ubuntu-24-04-x64",
                "ssh_keys": [key_id],
                "tags": ["documents-backend"],
            })),
        )?;
        config.droplet_id = created
            .pointer("/droplet/id")
            .and_then(Value::as_u64)
            .ok_or_else(|| "DigitalOcean did not finish creating the computer. Try again.".to_string())?;
        write_config(&config_path(data_dir), &config)?;
        report(working_message());
        config.public_ip = wait_for_ip(&config)?;
        require_ip(&config.public_ip)?;
        write_config(&config_path(data_dir), &config)?;
    }
    require_ip(&config.public_ip)?;

    let repo = find_repo()?;
    let key_path = write_private_key(data_dir, &config.ssh_private_key)?;
    let known_hosts = data_dir.join("known_hosts");
    report(working_message());
    wait_for_ssh(&config.public_ip)?;
    let _ = ssh_run(
        &key_path,
        &known_hosts,
        &config.public_ip,
        "cloud-init status --wait || true",
    );

    report(working_message());
    upload_repo(&repo, &key_path, &known_hosts, &config.public_ip)?;
    upload_env(&config, data_dir, &key_path, &known_hosts)?;

    report(working_message());
    ssh_run(
        &key_path,
        &known_hosts,
        &config.public_ip,
        &format!("PUBLIC_IP={} bash /opt/fourss/desktop-shell/deploy/deploy.sh", shell_quote(&config.public_ip)),
    )?;
    report("Your app is ready.".into());
    Ok(config)
}

fn require_field(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{label} is needed before we can make your app."))
    } else {
        Ok(())
    }
}

fn wait_for_ip(config: &DeploymentConfig) -> Result<String, String> {
    let deadline = Instant::now() + Duration::from_secs(180);
    let path = format!("/droplets/{}", config.droplet_id);
    loop {
        let body = do_request(&config.digital_ocean_token, "GET", &path, None)?;
        if let Some(ip) = public_ip(&body) {
            return Ok(ip);
        }
        if Instant::now() > deadline {
            return Err("The computer is taking too long to come online. Wait a moment, then try again.".into());
        }
        std::thread::sleep(Duration::from_secs(5));
    }
}

fn public_ip(body: &Value) -> Option<String> {
    let networks = body.pointer("/droplet/networks/v4")?.as_array()?;
    networks.iter().find_map(|network| {
        let kind = network.get("type").and_then(Value::as_str)?;
        if kind == "public" {
            network
                .get("ip_address")
                .and_then(Value::as_str)
                .map(str::to_string)
        } else {
            None
        }
    })
}

fn wait_for_ssh(ip: &str) -> Result<(), String> {
    let address: SocketAddr = format!("{ip}:22")
        .parse()
        .map_err(|_| format!("{ip} is not a usable IP address."))?;
    let deadline = Instant::now() + Duration::from_secs(180);
    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&address, Duration::from_secs(3)).is_ok() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_secs(3));
    }
    Err("SSH did not open on the droplet in time.".into())
}

fn generate_ssh_key(data_dir: &Path, config: &mut DeploymentConfig) -> Result<(), String> {
    let dir = data_dir.join("ssh");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let key = dir.join("id_ed25519");
    let _ = fs::remove_file(&key);
    let _ = fs::remove_file(dir.join("id_ed25519.pub"));
    let status = Command::new("ssh-keygen")
        .args([
            "-t",
            "ed25519",
            "-f",
            &key.to_string_lossy(),
            "-N",
            "",
            "-C",
            "documents-shell",
        ])
        .status()
        .map_err(|err| format!("ssh-keygen failed: {err}"))?;
    if !status.success() {
        return Err("ssh-keygen could not create a key.".into());
    }
    config.ssh_private_key = fs::read_to_string(&key).map_err(|err| err.to_string())?;
    config.ssh_public_key =
        fs::read_to_string(dir.join("id_ed25519.pub")).map_err(|err| err.to_string())?;
    config.ssh_public_key = config.ssh_public_key.trim().to_string();
    Ok(())
}

fn write_private_key(data_dir: &Path, private_key: &str) -> Result<PathBuf, String> {
    let path = data_dir.join("ssh").join("id_ed25519");
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .mode(0o600)
            .open(&path)
            .map_err(|err| err.to_string())?;
        file.write_all(private_key.as_bytes())
            .map_err(|err| err.to_string())?;
    }
    #[cfg(not(unix))]
    {
        fs::write(&path, private_key).map_err(|err| err.to_string())?;
    }
    Ok(path)
}

fn upload_repo(repo: &Path, key: &Path, known_hosts: &Path, ip: &str) -> Result<(), String> {
    ssh_run(key, known_hosts, ip, "mkdir -p /opt/fourss")?;
    let mut tar = Command::new("tar")
        .current_dir(repo)
        .args([
            "-czf",
            "-",
            "--exclude",
            "node_modules",
            "--exclude",
            "dist",
            "--exclude",
            ".git",
            "--exclude",
            "storage",
            "--exclude",
            ".env",
            "--exclude",
            "droplet.env",
            "documents_backend",
            "documents_dashboard",
            "desktop-shell/deploy",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| format!("tar failed to start: {err}"))?;
    let stdout = tar
        .stdout
        .take()
        .ok_or_else(|| "tar produced no output.".to_string())?;
    let mut ssh = ssh_command(key, known_hosts, ip);
    ssh.arg("tar -xzf - -C /opt/fourss")
        .stdin(Stdio::from(stdout))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let ssh = ssh
        .spawn()
        .map_err(|err| format!("ssh failed to start: {err}"))?;
    let ssh_output = ssh
        .wait_with_output()
        .map_err(|err| format!("ssh upload failed: {err}"))?;
    let tar_output = tar
        .wait_with_output()
        .map_err(|err| format!("tar failed: {err}"))?;
    if !tar_output.status.success() {
        return Err(format!(
            "Could not pack the app: {}",
            String::from_utf8_lossy(&tar_output.stderr)
        ));
    }
    if !ssh_output.status.success() {
        return Err(format!(
            "Could not upload the app: {}",
            String::from_utf8_lossy(&ssh_output.stderr)
        ));
    }
    Ok(())
}

fn upload_env(
    config: &DeploymentConfig,
    data_dir: &Path,
    key: &Path,
    known_hosts: &Path,
) -> Result<(), String> {
    let env_path = data_dir.join("droplet.env");
    let contents = format!(
        "DB_HOST=mysql\nDB_PORT=3306\nDB_USER=documents\nDB_PASSWORD={db}\nDB_NAME=documents\nNODE_ENV=production\nPORT=3012\nRESEND_API_KEY={resend}\nFRONTEND_URL=http://{ip}\nFILE_STORAGE_DIR=storage\nFROM_EMAIL={from}\nENCRYPTION_KEY={encryption}\nENVIRONMENT=production\nADMIN_EMAIL={admin}\nADMIN_PASSWORD={admin_password}\nSECRET_KEY={secret}\nREDIS_URI=redis://redis:6379\nRABBIT_HOST=amqp://guest:guest@rabbitmq:5672\nPUBLIC_IP={ip}\n",
        db = config.db_password,
        resend = config.resend_api_key,
        ip = config.public_ip,
        from = config.from_email,
        encryption = config.encryption_key,
        admin = config.admin_email,
        admin_password = config.admin_password,
        secret = config.secret_key,
    );
    write_private_file(&env_path, contents.as_bytes())?;
    let destination = format!(
        "{}:/opt/fourss/desktop-shell/deploy/.env",
        ssh_destination(&config.public_ip)?
    );
    let status = scp_command(key, known_hosts)
        .arg(&env_path)
        .arg(&destination)
        .status()
        .map_err(|err| format!("scp failed to start: {err}"))?;
    if !status.success() {
        return Err("Could not upload the environment file.".into());
    }
    ssh_run(
        key,
        known_hosts,
        &config.public_ip,
        "chmod 600 /opt/fourss/desktop-shell/deploy/.env",
    )
}

fn ssh_run(key: &Path, known_hosts: &Path, ip: &str, remote: &str) -> Result<(), String> {
    ssh_destination(ip)?;
    let output = ssh_command(key, known_hosts, ip)
        .arg(remote)
        .output()
        .map_err(|err| format!("ssh failed to start: {err}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Remote command failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ))
    }
}

fn ssh_command(key: &Path, known_hosts: &Path, ip: &str) -> Command {
    let mut command = Command::new("ssh");
    command.args(ssh_base_args(key, known_hosts));
    command.arg(ssh_destination(ip).unwrap_or_else(|_| "root@invalid".into()));
    command
}

fn scp_command(key: &Path, known_hosts: &Path) -> Command {
    let mut command = Command::new("scp");
    command.args(ssh_base_args(key, known_hosts));
    command
}

fn ssh_base_args(key: &Path, known_hosts: &Path) -> Vec<String> {
    vec![
        "-i".into(),
        key.display().to_string(),
        "-o".into(),
        "IdentitiesOnly=yes".into(),
        "-o".into(),
        "StrictHostKeyChecking=accept-new".into(),
        "-o".into(),
        format!("UserKnownHostsFile={}", known_hosts.display()),
    ]
}

fn find_repo() -> Result<PathBuf, String> {
    let mut starts = Vec::new();
    if let Ok(current) = std::env::current_dir() {
        starts.push(current);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            starts.push(parent.to_path_buf());
        }
    }
    for start in starts {
        let mut cursor = Some(start.as_path());
        for _ in 0..8 {
            let Some(dir) = cursor else { break };
            if dir.join("documents_backend/package.json").is_file()
                && dir.join("documents_dashboard/package.json").is_file()
                && dir.join("desktop-shell/deploy/deploy.sh").is_file()
            {
                return Ok(dir.to_path_buf());
            }
            cursor = dir.parent();
        }
    }
    Err("Could not find the app folders next to desktop-shell.".into())
}

fn do_request(
    token: &str,
    method: &str,
    path: &str,
    body: Option<Value>,
) -> Result<Value, String> {
    let url = format!("{API}{path}");
    let request = match method {
        "GET" => ureq::get(&url),
        "POST" => ureq::post(&url),
        "DELETE" => ureq::delete(&url),
        _ => return Err(format!("Unsupported method {method}.")),
    };
    let response = if let Some(body) = body {
        request
            .set("Authorization", &format!("Bearer {token}"))
            .set("Content-Type", "application/json")
            .send_json(body)
    } else {
        request
            .set("Authorization", &format!("Bearer {token}"))
            .call()
    };
    match response {
        Ok(response) => {
            let text = response.into_string().unwrap_or_default();
            if text.trim().is_empty() {
                Ok(Value::Null)
            } else {
                serde_json::from_str(&text)
                    .map_err(|err| format!("DigitalOcean returned unreadable JSON: {err}"))
            }
        }
        Err(ureq::Error::Status(code, response)) => {
            let text = response.into_string().unwrap_or_default();
            let message = serde_json::from_str::<Value>(&text)
                .ok()
                .and_then(|value| {
                    value
                        .get("message")
                        .and_then(Value::as_str)
                        .map(str::to_string)
                })
                .unwrap_or(text);
            if message.to_lowercase().contains("payment") {
                Err(format!(
                    "{message} Add a card at {BILLING_URL} and try again."
                ))
            } else {
                Err(format!("DigitalOcean returned {code}: {message}"))
            }
        }
        Err(err) => Err(format!("DigitalOcean request failed: {err}")),
    }
}

fn write_config(path: &Path, config: &DeploymentConfig) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(config).map_err(|err| err.to_string())?;
    write_private_file(path, &bytes)
}

fn read_config(path: &Path) -> Result<DeploymentConfig, String> {
    let text = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&text).map_err(|err| format!("Deployment settings are unreadable: {err}"))
}

fn random_token(len: usize) -> String {
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut bytes = vec![0u8; len];
    let mut file = File::open("/dev/urandom").expect("urandom");
    file.read_exact(&mut bytes).expect("urandom");
    bytes
        .into_iter()
        .map(|byte| ALPHABET[(byte as usize) % ALPHABET.len()] as char)
        .collect()
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn nonempty(value: &str) -> Option<&str> {
    let trimmed = value.trim();
    if trimmed.is_empty() { None } else { Some(trimmed) }
}

fn reject_secret_text(label: &str, value: &str) -> Result<(), String> {
    if value.chars().any(|character| character.is_control() || character.is_whitespace()) {
        Err(format!("{label} cannot contain spaces or line breaks."))
    } else if value.len() > 500 {
        Err(format!("{label} is too long."))
    } else {
        Ok(())
    }
}

fn working_message() -> String {
    "Working on making your app. This can take a while. Leave this window open.".into()
}

fn region_is_offered(region: &Value) -> bool {
    if region.get("available").and_then(Value::as_bool) != Some(true) {
        return false;
    }
    region
        .get("sizes")
        .and_then(Value::as_array)
        .map(|sizes| sizes.iter().any(|size| size.as_str() == Some(DROPLET_SIZE)))
        .unwrap_or(false)
}

pub fn plain_failure(message: &str) -> String {
    let lower = message.to_lowercase();
    let place_unavailable = lower.contains("invalid region")
        || ((lower.contains("region") || lower.contains("size"))
            && (lower.contains("not available") || lower.contains("unavailable")));
    if place_unavailable {
        return "That place is not available. Choose another place close to your team, then try again.".into();
    }
    if lower.contains("not authorized") || lower.contains("returned 403") {
        return "DigitalOcean did not accept this key. Create a new key and choose Full Access, as in the picture.".into();
    }
    if lower.contains("payment") || lower.contains("billing") {
        return format!("DigitalOcean needs a payment card on the account before it can create the computer. Add a card at {BILLING_URL}, then try again.");
    }
    if lower.contains("remote command failed") || lower.contains("failed to solve") || message.len() > 240 {
        return "We could not finish making your app. Wait a moment, then try again.".into();
    }
    message.to_string()
}

fn valid_region(value: &str) -> bool {
    let mut chars = value.chars();
    matches!(chars.next(), Some(first) if first.is_ascii_lowercase())
        && value.len() <= 32
        && value
            .chars()
            .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit())
}

fn require_ip(value: &str) -> Result<IpAddr, String> {
    value
        .parse()
        .map_err(|_| format!("{value} is not a usable IP address."))
}

fn ssh_destination(ip: &str) -> Result<String, String> {
    match require_ip(ip)? {
        IpAddr::V4(address) => Ok(format!("root@{address}")),
        IpAddr::V6(address) => Ok(format!("root@[{address}]")),
    }
}

fn write_private_file(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        let mut file = fs::OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .mode(0o600)
            .open(path)
            .map_err(|err| err.to_string())?;
        file.write_all(bytes).map_err(|err| err.to_string())?;
    }
    #[cfg(not(unix))]
    {
        fs::write(path, bytes).map_err(|err| err.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_read_writes_an_empty_configuration() {
        let dir = std::env::temp_dir().join(format!("shell-deploy-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let config = ensure_config(&dir).unwrap();
        assert!(config.digital_ocean_token.is_empty());
        assert!(config.resend_api_key.is_empty());
        assert!(config.public_ip.is_empty());
        assert_eq!(config.region, "nyc3");
        assert!(config_path(&dir).is_file());
        let again = ensure_config(&dir).unwrap();
        assert_eq!(again, config);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn the_window_does_not_receive_saved_secrets() {
        let mut config = DeploymentConfig::default();
        config.digital_ocean_token = "dop_v1_secret".into();
        config.resend_api_key = "re_secret".into();
        config.ssh_private_key = "private-key".into();
        config.db_password = "db-secret".into();
        config.encryption_key = "enc-secret".into();
        config.secret_key = "jwt-secret".into();
        config.admin_password = "admin-secret".into();
        config.public_ip = "203.0.113.10".into();
        let view = view(config, "", false);
        let json = serde_json::to_string(&view).unwrap();
        assert!(view.has_digital_ocean_token);
        assert!(view.has_resend_api_key);
        assert_eq!(view.admin_password, "admin-secret");
        assert!(!json.contains("dop_v1_secret"));
        assert!(!json.contains("re_secret"));
        assert!(!json.contains("private-key"));
        assert!(!json.contains("db-secret"));
        assert!(!json.contains("enc-secret"));
        assert!(!json.contains("jwt-secret"));
    }

    #[test]
    fn an_empty_token_does_not_erase_the_saved_one() {
        let dir = std::env::temp_dir().join(format!("shell-deploy-keep-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        save_input(
            &dir,
            DeploymentInput {
                digital_ocean_token: "dop_v1_secret".into(),
                resend_api_key: String::new(),
                from_email: String::new(),
                admin_email: String::new(),
                region: "nyc3".into(),
                size: "ignored".into(),
            },
        )
        .unwrap();
        let kept = save_input(
            &dir,
            DeploymentInput {
                digital_ocean_token: String::new(),
                resend_api_key: "re_secret".into(),
                from_email: String::new(),
                admin_email: String::new(),
                region: "sfo3".into(),
                size: String::new(),
            },
        )
        .unwrap();
        assert_eq!(kept.digital_ocean_token, "dop_v1_secret");
        assert_eq!(kept.resend_api_key, "re_secret");
        assert_eq!(kept.region, "sfo3");
        assert_eq!(kept.size, DROPLET_SIZE);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn an_unavailable_place_is_explained_in_plain_language() {
        let message = plain_failure("DigitalOcean returned 422: Size is not available in this region.");
        assert!(message.contains("Choose another place"));
        assert!(!message.contains("422"));
        assert!(!region_is_offered(&json!({
            "slug": "nyc1",
            "available": true,
            "sizes": ["s-1vcpu-1gb"]
        })));
        assert!(region_is_offered(&json!({
            "slug": "nyc3",
            "available": true,
            "sizes": ["s-2vcpu-4gb"]
        })));
    }

    #[test]
    fn a_finished_setup_can_be_copied_somewhere_else() {
        let dir = std::env::temp_dir().join(format!("shell-deploy-export-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let mut config = ensure_config(&dir).unwrap();
        config.public_ip = "203.0.113.10".into();
        config.admin_password = "sign-in-secret".into();
        write_config(&config_path(&dir), &config).unwrap();
        let destination = dir.join("copy.json");
        export_configuration(&dir, &destination).unwrap();
        let copy = fs::read_to_string(&destination).unwrap();
        assert!(copy.contains("sign-in-secret"));
        assert!(export_configuration(&dir, &config_path(&dir)).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
