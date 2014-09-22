class ruby(
  $version  = '2.1.1',
  $checksum = 'e57fdbb8ed56e70c43f39c79da1654b2'
){

  $ruby_home    = "/opt/rubies/ruby-${version}"


  file { '/opt/rubies':
    ensure  => directory,
    owner   => 'root',
    group   => 'root'
  }

  exec { 'download-ruby':
    command => "curl -L -o /tmp/ruby.tar.gz http://cache.ruby-lang.org/pub/ruby/2.1/ruby-${version}.tar.gz",
    path    => $path,
    unless  => "test -d /opt/rubies/ruby-${version}",
    require => Package['curl']
  }

  -> exec { 'check-downloaded-ruby':
    command => "md5sum /tmp/ruby.tar.gz | grep ${checksum}",
    path    => $path,
    onlyif  => 'test -f /tmp/ruby.tar.gz'
  }

  -> exec { 'unpack-ruby':
    command => 'tar xzf /tmp/ruby.tar.gz -C /tmp',
    path    => $path,
    onlyif  => 'test -f /tmp/ruby.tar.gz',
    unless  => "test -d /tmp/ruby-${version}"
  }

  -> exec { 'configure-ruby':
    command => "/tmp/ruby-${version}/configure --prefix=${ruby_home}",
    cwd     => "/tmp/ruby-${version}",
    path    => $path,
    onlyif  => "test -d /tmp/ruby-${version}",
    require => [
      Exec['unpack-ruby'],
      Package['libssl-dev'],
      File['/opt/rubies']
    ]
  }

  -> exec { 'install-ruby':
    command => "make install",
    cwd     => "/tmp/ruby-${version}",
    path    => $path,
    onlyif  => "test -d /tmp/ruby-${version}"
  }

  include ruby::chruby

  exec { 'gem-install-bundler':
    command => "${as_vagrant} \"gem install bundler\"",
    require => File['/etc/profile.d/chruby.sh']
  }
}

