$as_vagrant = 'sudo -u vagrant -H bash -l -c'
$application = 'arkivo'

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

package { [
    'build-essential',
    'curl',
    'git-core'
  ]:
  ensure => latest
}
# --- Redis ------------------------------------------------------------------

class { 'redis':
  listen => '127.0.0.1'
}

