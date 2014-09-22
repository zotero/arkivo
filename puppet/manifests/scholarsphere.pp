$as_vagrant = 'sudo -u vagrant -H bash -l -c'
$application = 'scholarsphere'

group { 'puppet':
  ensure => present
}

Exec {
  path => ['/usr/sbin', 'sbin', '/usr/bin', '/bin']
}

# --- Preinstall Stage -------------------------------------------------------

exec { 'apt-get-update':
  command => 'apt-get -y update'
}
# Make sure apt-get update is run before
# installing package resources.
Exec['apt-get-update'] -> Package <| |>


# --- Debian Packages --------------------------------------------------------

# General Dependencies
package { [
    'curl',
    'git-core'
  ]:
  ensure => latest
}
# Ruby Dependencies
package { [
    'build-essential',
    'libffi-dev',
    'libgdbm-dev',
    'libncurses5-dev',
    'libreadline-dev',
    'libyaml-dev',
    'zlib1g-dev',
    'libssl-dev'
  ]:
  ensure => latest
}
# Sqlite3 Dependencies
package { [
    'sqlite3',
    'libsqlite3-dev'
  ]:
  ensure => latest
}
# Additional Scholarsphere Dependencies
package { [
    'clamav',
    'clamav-daemon',
    'libclamav-dev',
    'imagemagick',
    'libmagickcore-dev',
    'libmagickwand-dev',
    'ffmpeg',
    'ghostscript',
    'mysql-common',
    'libmysqlclient-dev',
    'openjdk-7-jdk'
  ]:
  ensure => latest
}

# --- Redis ------------------------------------------------------------------

class { 'redis':
  listen => '*'
}

# --- Node.js ----------------------------------------------------------------

class { 'nodejs':
  user    => 'vagrant',
  version => '0.11.13'
}

# --- Ruby --------------------------------------------------------------------

class { 'ruby':
  version  => '2.1.1',
  checksum => 'e57fdbb8ed56e70c43f39c79da1654b2'
}

# --- Scholarsphere -----------------------------------------------------------

class { 'scholarsphere':
  user => 'vagrant'
}
