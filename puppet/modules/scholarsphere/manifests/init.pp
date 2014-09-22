class scholarsphere(
  $user  = 'vagrant',
  $group = 'vagrant',
  $home  = "/home/${user}",
  $root  = "${home}/scholarsphere",
  $repo  = 'https://github.com/psu-stewardship/scholarsphere.git'
){

  exec { 'git-clone':
    command => "git clone ${repo} ${root}",
    cwd     => $home,
    user    => $user,
    creates => $root,
    unless  => "test -d ${root}",
    require => Package['git-core']
  }

  -> file { "${root}/config/database.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/database.yml.sample"
  }

  -> file { "${root}/config/fedora.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/fedora.yml.sample"
  }

  -> file { "${root}/config/solr.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/solr.yml.sample"
  }

  -> file { "${root}/config/redis.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/redis.yml.sample"
  }

  -> file { "${root}/config/hydra-ldap.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/hydra-ldap.yml.sample"
  }

  -> file { "${root}/config/devise.yml":
    ensure => present,
    owner  => $user,
    group  => $group,
    source => "${root}/config/devise.yml.sample"
  }
}
