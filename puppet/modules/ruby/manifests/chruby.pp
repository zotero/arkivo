class ruby::chruby {
  $chruby_version = '0.3.8'

  # package { 'gnupg': ensure => present }

  exec { 'download-chruby':
    command => "curl -L -o /tmp/chruby.tar.gz https://github.com/postmodern/chruby/archive/v${chruby_version}.tar.gz",
    path    => $path,
    creates => '/tmp/chruby.tar.gz',
    unless  => "test -f /usr/local/share/chruby/chruby.sh",
    require => [Package['curl'], Exec['install-ruby']]
  }

  #exec { 'download-chruby-signature':
  #  command => "curl -O https://raw.github.com/postmodern/chruby/master/pkg/chruby-${chruby_version}.tar.gz.asc",
  #  path    => $path,
  #  cwd     => '/tmp',
  #  creates => "/tmp/chruby-${chruby_version}.tar.gz.asc",
  #  require => Exec['download-chruby']
  #}

  #exec { 'check-downloaded-chruby':
  #  command => "gpg --verify chruby-${chruby_version}.tar.gz.asc chruby.tar.gz",
  #  cwd     => '/tmp',
  #  path    => $path,
  #  require => [Package['gnupg'], Exec['download-chruby-signature']]
  #}

  -> exec { 'unpack-chruby':
    command => 'tar xzf /tmp/chruby.tar.gz -C /tmp',
    path    => $path,
    onlyif  => 'test -f /tmp/chruby.tar.gz'
  }

  -> exec { 'install-chruby':
    command => "make install",
    cwd     => "/tmp/chruby-${chruby_version}",
    path    => $path,
    creates => '/usr/local/share/chruby/chruby.sh'
  }

  -> file { '/etc/profile.d/chruby.sh':
    ensure  => present,
    content => "source /usr/local/share/chruby/chruby.sh\nchruby ruby-${ruby::version}"
  }
}
