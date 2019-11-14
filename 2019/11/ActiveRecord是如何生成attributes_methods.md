#### ActiveRecord::Base是如何生成attributes_methods?

关于这个问题，相信看过《Ruby元编程》一书的伙伴能了解到从rails1到3的介绍。但是，rails发展至今已经到rails6了，整个实现也发生了比较大的变化。抱着好奇的想法，一探究竟。话不多说，上代码：

1.首先，追溯到代码的源头**ActiveRecord::Core**
在**ActiveRecor::Base**实例初始化的时候，调用了**define_attribute_methods**：
```
def initialize(attributes = nil)
  @new_record = true
  @attributes = self.class._default_attributes.deep_dup

  init_internals
  initialize_internals_callback

  assign_attributes(attributes) if attributes

  yield self if block_given?
  _run_initialize_callbacks
end

def init_internals
  @primary_key              = self.class.primary_key
  @readonly                 = false
  @destroyed                = false
  @marked_for_destruction   = false
  @destroyed_by_association = nil
  @_start_transaction_state = nil
  @transaction_state        = nil

  self.class.define_attribute_methods
end
```

2.**define_attribute_methods**是**ActiveRecord::AttributesRecords**里的一个类方法。代码很简单，在调用父类方法的基础上做了包装,加了互斥锁防止重复调用。
```
def define_attribute_methods # :nodoc:
  return false if @attribute_methods_generated
  # Use a mutex; we don't want two threads simultaneously trying to define
  # attribute methods.
  generated_attribute_methods.synchronize do
    return false if @attribute_methods_generated
    superclass.define_attribute_methods unless base_class?
    super(attribute_names)
    @attribute_methods_generated = true
  end
end
```

3.然后我们看到父类的方法，也就是在ActiveModel::AttributeMethods里。首先在include父类的时候会创建一个**attribute_method_matchers**，来存放不同生成不同attributes的方法,且默认在数组里创建一条没有prefix和suffix的macher（就是每个实例的实例方法比如**order.user_id**）。

```
included do
  class_attribute :attribute_aliases, instance_writer: false, default: {}
  class_attribute :attribute_method_matchers, instance_writer: false, default: [ ClassMethods::AttributeMethodMatcher.new ]
end
```

可以通过以下两个方法为matchers的数据添加不同规则的attribute methods：
```
def attribute_method_prefix(*prefixes)
  self.attribute_method_matchers += prefixes.map! { |prefix| AttributeMethodMatcher.new prefix: prefix }
  undefine_attribute_methods
end

def attribute_method_suffix(*suffixes)
  self.attribute_method_matchers += suffixes.map! { |suffix| AttributeMethodMatcher.new suffix: suffix }
  undefine_attribute_methods
end
```

在**ActiveRecord::AttributeMethods**里我们include了我们需要的methods生成模块:
```
included do
  initialize_generated_modules
  include Read
  include Write
  include BeforeTypeCast
  include Query
  include PrimaryKey
  include TimeZoneConversion
  include Dirty
  include Serialization

  delegate :column_for_attribute, to: :class
end
```

比如Writer模块里：
```
included do
  attribute_method_suffix "="
end

module ClassMethods # :nodoc:
  private

    def define_method_attribute=(name)
      ActiveModel::AttributeMethods::AttrNames.define_attribute_accessor_method(
        generated_attribute_methods, name, writer: true,
      ) do |temp_method_name, attr_name_expr|
        generated_attribute_methods.module_eval <<-RUBY, __FILE__, __LINE__ + 1
          def #{temp_method_name}(value)
            name = #{attr_name_expr}
            _write_attribute(name, value)
          end
        RUBY
      end
    end
end
```
4.include的时候会将 加入一个 suffix为=的matcher到matchers里。最后就是遍历所有的matchers根据相应的规则生成对应的attribute methods,有generate_methods的会生成对应的方法，就像writer模块里的define_method_attribute=方法。
```
def define_attribute_methods(*attr_names)
  attr_names.flatten.each { |attr_name| define_attribute_method(attr_name) }
end

def define_attribute_method(attr_name)
  attribute_method_matchers.each do |matcher|
    method_name = matcher.method_name(attr_name)

    unless instance_method_already_implemented?(method_name)
      generate_method = "define_method_#{matcher.target}"

      if respond_to?(generate_method, true)
        send(generate_method, attr_name.to_s)
      else
        define_proxy_call true, generated_attribute_methods, method_name, matcher.target, attr_name.to_s
      end
    end
  end
  attribute_method_matchers_cache.clear
end
```