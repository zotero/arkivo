class redis(
  $listen       = '127.0.0.1',
  $package_name = $::redis::params::package_name,
  $service_name = $::redis::params::service_name,
) inherits redis::params {

  package { $package_name:
    ensure => latest
  }

  -> file { '/etc/redis/redis.conf':
    ensure  => present,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('redis/redis.conf.erb')
  }

  -> service { $service_name:
    ensure     => running,
    enable     => true,
    hasrestart => true,
    require    => Package[$package_name]
  }
}
