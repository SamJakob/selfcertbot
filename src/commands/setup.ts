import { Command } from '@oclif/core';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as ora from 'ora';

import * as fs from 'node:fs/promises';

import { promisify } from 'util';
import { exec, ExecOptions } from 'node:child_process';
import * as path from 'path';
import * as os from 'os';
import { createDirIfNotExists, directoryExists, fileExists } from '../utils/files';
import { Executor } from '../utils/execute';

export default class Setup extends Command {
  static description = 'Perform initial set-up (create the root CI certificate).';

  static usage = '<%= command.id %>';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  public async run(): Promise<void> {
    // Print welcome banner (setup command usually invoked first).
    console.log(chalk.blueBright('Welcome to SelfCertBot!'));
    console.log(chalk.blue('by SamJakob - https://github.com/SamJakob/selfcertbot'));
    console.log("");

    // Check for existence of valid config file.
    const configFile = path.join(os.homedir(), '.selfcertbot');
    if (await fileExists(configFile)) {
      console.error('~/.selfcertbot already exists. If you wish to set it up again, please remove this file and re-run the command.');
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'ca_path',
        message: `What directory would you like to use to store the CA certificate and keys?\nThe directory should exist ${chalk.bold.redBright('and any files in it will be removed')}.\n>`,
        async filter(input) {
          if (input[0] == '~') input = path.join(os.homedir(), input.slice(1));
          return await fs.realpath(input);
        },
        async validate (input) {
          return await directoryExists(input) || 'You must specify an existing directory.';
        }
      }
    ]);

    const executor = new Executor({
      cwd: answers.ca_path
    });

    // Remove all files in directory.
    const spinner = ora('Please wait, checking directory...').start();
    const ca_path_files = await fs.readdir(answers.ca_path);
    for (const file of ca_path_files) {
      await fs.unlink(path.join(answers.ca_path, file));
    }
    spinner.succeed("Let's begin!");

    // Generate private key for CA certificate.
    console.log(chalk.bold.blue(`First, we need to generate an RSA private key for the ${chalk.blueBright('Root CA Certificate')}.`));
    console.log(chalk.bold.blue(`The next prompt is to enter a password for this key. Pick a good one and remember it!`));
    await executor.process('openssl genrsa -aes256 -out ./ca.key 4096');

    // Generate private key for intermediary.
    console.log(chalk.bold.blue(`Next up, we need to generate an RSA private key for the ${chalk.blueBright('Intermediary CA Certificate')}.`));
    console.log(chalk.bold.blue(`The next prompt is to enter a password for this key. Pick a good one and remember it!`));
    await executor.process('openssl genrsa -aes256 -out ./int.key 4096');

    // Create root CA certificate.
    await executor.process('openssl req -new -x509 -extensions v3_ca -key ./ca.key -out ./ca.pem');
    // Create intermediary CA certificate signing request.
    await executor.process('openssl req -new -key ./int.key -out ./int.csr');

    // Write the certificate serial.
    const serial = await fs.open(path.join(answers.ca_path, 'serial'), 'w');
    await serial.write('1000');
    await serial.close();

    // Write certificate revocation list number for intermediate.
    const intCrl = await fs.open(path.join(answers.ca_path, 'crlnumber'), 'w');
    await intCrl.write('1000');
    await intCrl.close();

    // Create necessary directories.
    await createDirIfNotExists(path.join(answers.ca_path, 'crl'));
    await createDirIfNotExists(path.join(answers.ca_path, 'newcerts'));

    // Create necessary files.
    await (await fs.open(path.join(answers.ca_path, 'index.txt'), 'w')).close();

    // Write intermediary configuration.
    const intCfg = await fs.open(path.join(answers.ca_path, 'int.cnf'), 'w');
    await intCfg.write(
`[ca]
# \`man ca\`
default_ca                  = CA_default

[ CA_default ]
# Directory and file locations.
dir                         = ${answers.ca_path}
crl_dir                     = $dir/crl
database                    = $dir/index.txt
serial                      = $dir/serial
new_certs_dir               = $dir/newcerts

# The root key and certificate
private_key                 = $dir/ca.key
certificate                 = $dir/ca.pem

# Certificate Revocation Lists
crl                         = $dir/int_crl.pem
crlnumber                   = $dir/crlnumber
crl_extensions              = crl_ext
default_crl_days            = 30

# Use sha512 instead of sha1
default_md                  = sha512

name_opt                    = ca_default
cert_opt                    = ca_default
default_days                = 375
preserve                    = no
policy                      = policy_loose

[ policy_loose ]
countryName                 = optional
stateOrProvinceName         = optional
localityName                = optional
organizationName            = optional
organizationalUnitName      = optional
commonName                  = supplied
emailAddress                = optional

[ req ]
# Options for the req tool.
default_bits                = 4096
distinguished_name          = req_distinguished_name
string_mask                 = utf8only

default_md                  = sha512

x509_extensions             = v3_ca

[ req_distinguished_name ]
# See https://en.wikipedia.org/wiki/Certificate_signing_request.
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
0.organizationName              = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

# TODO: defaults

[ v3_ca ]
subjectKeyIdentifier        = hash
authorityKeyIdentifier      = keyid:always,issuer
basicConstraints            = critical, CA:true
keyUsage                    = critical, digitalSignature, cRLSign, keyCertSign

[ v3_intermediate_ca ]
subjectKeyIdentifier        = hash
authorityKeyIdentifier      = keyid:always,issuer
basicConstraints            = critical, CA:true, pathlen:0
keyUsage                    = critical, digitalSignature, cRLSign, keyCertSign

[ usr_cert ]
basicConstraints            = CA:FALSE
nsCertType                  = client, email
nsComment                   = "Client Certificate (Generated by OpenSSL)"
subjectKeyIdentifier        = hash
authorityKeyIdentifier      = keyid,issuer
keyUsage                    = critical, nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage            = clientAuth, emailProtection

[ server_cert ]
basicConstraints            = CA:FALSE
nsCertType                  = server
nsComment                   = "Server Certificate (Generated by OpenSSL)"
subjectKeyIdentifier        = hash
authorityKeyIdentifier      = keyid,issuer:always
keyUsage                    = critical, digitalSignature, keyEncipherment
extendedKeyUsage            = serverAuth

[ crl_ext ]
authorityKeyIdentifier      = keyid:always

[ ocsp ]
basicConstraints            = CA:FALSE
subjectKeyIdentifier        = hash
authorityKeyIdentifier      = keyid,issuer
keyUsage                    = critical, digitalSignature
extendedKeyUsage            = critical, OCSPSigning
`);
    await intCfg.close();

    // Sign intermediary with root CA
    await executor.process('openssl ca -config ./int.cnf -extensions v3_intermediate_ca -days 3600 -md sha512 -in ./int.csr -out ./int.pem');

    // Create a chain certificate.
    await executor.command('cat ./int.pem ./ca.pem > chain.pem');

    // Update permissions
    await executor.command('chmod 400 ./*.key');
    await executor.command('chmod 444 chain.pem');

    // Write ~/.selfcertbot with path to CA directory to indicate setup success.
    const ssb = await fs.open(path.join(os.homedir(), '.selfcertbot'), 'w');
    await ssb.write(answers.ca_path);
    await ssb.close();
  }

}
